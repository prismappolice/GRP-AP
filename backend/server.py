# ==================== IMPORTS ====================
import os
import sys
import json
import smtplib
import email.mime.text
import email.mime.multipart
from dotenv import load_dotenv
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), ".env"))
import ast
import enum
import logging
import re
import uuid
import secrets
import hashlib
from pathlib import Path
from datetime import datetime, timezone, timedelta
from typing import Annotated, Any, Dict, List, Mapping, Optional, Union

import bcrypt
import jwt
from fastapi import APIRouter, Depends, FastAPI, File, Form, HTTPException, Request, UploadFile
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, EmailStr, Field
try:
    from pydantic import ConfigDict
except ImportError:
    ConfigDict = dict  # type: ignore[assignment,misc]
from sqlalchemy import Column, DateTime, String, Integer, or_, func, desc
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.future import select
from sqlalchemy.orm import declarative_base, sessionmaker
from sqlalchemy.sql import text

try:
    from .admin_model import Base as AdminModelBase
except ImportError:
    from admin_model import Base as AdminModelBase  # type: ignore

# ==================== CONFIGURATION ====================
ROOT_DIR = Path(__file__).parent
_raw_database_url = (
    os.environ.get("POSTGRES_URL")
    or os.environ.get("DATABASE_URL")
    or "postgresql+asyncpg://postgres:password@localhost/grp_db"
)
POSTGRES_URL = _raw_database_url.strip().strip('"').strip("'")
if POSTGRES_URL.startswith("postgresql://") and "+asyncpg" not in POSTGRES_URL:
    POSTGRES_URL = POSTGRES_URL.replace("postgresql://", "postgresql+asyncpg://", 1)
SECRET_KEY: str = os.environ.get("JWT_SECRET_KEY", "")
if not SECRET_KEY:
    raise RuntimeError("JWT_SECRET_KEY environment variable must be set before starting the server.")
ALGORITHM = "HS256"
PASSWORD_NAME_STOPWORDS = {"grp", "sub", "division", "circle", "rps", "rpop", "port", "rs"}
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.environ.get("ACCESS_TOKEN_EXPIRE_MINUTES", "30"))
TRUSTED_HOSTS = {
    host.strip().lower()
    for host in os.environ.get("TRUSTED_HOSTS", "13.233.250.180,grp.prismappolice.in,www.grp.prismappolice.in,localhost,127.0.0.1").split(",")
    if host.strip()
}
TERMINAL_COMPLAINT_STATUSES = {"approved", "resolved", "closed", "rejected"}
MAX_UPLOAD_SIZE_BYTES = 5 * 1024 * 1024
PUBLIC_SUBMISSION_MAX_ATTEMPTS = 5
PUBLIC_SUBMISSION_WINDOW_SECONDS = 10 * 60
IMAGE_MIME_EXTENSIONS = {
    "image/jpeg": {".jpg", ".jpeg"},
    "image/png": {".png"},
    "image/gif": {".gif"},
    "image/webp": {".webp"},
}
VIDEO_MIME_EXTENSIONS = {
    "video/mp4": {".mp4"},
    "video/webm": {".webm"},
    "video/ogg": {".ogv", ".ogg"},
    "video/quicktime": {".mov"},
    "video/x-msvideo": {".avi"},
}
DOC_MIME_EXTENSIONS = {
    "application/pdf": {".pdf"},
    **IMAGE_MIME_EXTENSIONS,
}

# ==================== RATE LIMITING (in-memory) ====================
import time
from collections import defaultdict
_login_attempts: dict = defaultdict(list)  # ip -> [timestamps]
LOGIN_MAX_ATTEMPTS = 10  # per window
LOGIN_WINDOW_SECONDS = 60
_public_submission_attempts: dict = defaultdict(list)
_captcha_challenges: Dict[str, Dict[str, Any]] = {}
_password_reset_attempts: dict = defaultdict(list)
PASSWORD_RESET_MAX_ATTEMPTS = 5
PASSWORD_RESET_WINDOW_SECONDS = 15 * 60
PASSWORD_RESET_OTP_EXPIRY_MINUTES = 10
PASSWORD_RESET_MAX_OTP_ATTEMPTS = 5
PASSWORD_HISTORY_LIMIT = 5

# ==================== EMAIL CONFIG ====================
SMTP_HOST: str = os.environ.get("SMTP_HOST", "")
SMTP_PORT: int = int(os.environ.get("SMTP_PORT", "587"))
SMTP_USER: str = os.environ.get("SMTP_USER", "")
SMTP_PASSWORD: str = os.environ.get("SMTP_PASSWORD", "")
ADMIN_ALERT_EMAIL: str = os.environ.get("ADMIN_ALERT_EMAIL", "")

# ==================== FASTAPI APP ====================
app = FastAPI()
security = HTTPBearer()
Base = declarative_base()


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    logger.warning("Validation error on %s %s: %s", request.method, request.url.path, exc.errors())
    return JSONResponse(content={"detail": "Invalid request."}, status_code=422)

raw_cors_origins = os.environ.get("CORS_ORIGINS", "")
allowed_cors_origins = [o.strip().strip('"').strip("'") for o in raw_cors_origins.split(",") if o.strip()]
allow_origin_regex = os.environ.get(
    "CORS_ORIGIN_REGEX",
    r"https?://(localhost|127\.0\.0\.1|[0-9.]+)(:\d+)?$",
)
if "*" in allowed_cors_origins:
    allowed_cors_origins = []
    allow_origin_regex = r"https?://.*"

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_cors_origins,
    allow_origin_regex=allow_origin_regex,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def validate_host_header(request: Request, call_next):
    host = request.headers.get("host", "").split(":", 1)[0].lower()
    if TRUSTED_HOSTS and host not in TRUSTED_HOSTS:
        return JSONResponse(content={"detail": "Invalid request host."}, status_code=400)
    return await call_next(request)


@app.middleware("http")
async def protect_complaint_uploads(request: Request, call_next):
    if request.url.path.startswith("/complaint_uploads/"):
        auth_header = request.headers.get("authorization", "")
        scheme, _, token = auth_header.partition(" ")
        if scheme.lower() != "bearer" or not token:
            return JSONResponse(content={"detail": "Authentication required."}, status_code=401)
        try:
            jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])  # type: ignore[arg-type]
        except Exception:
            return JSONResponse(content={"detail": "Invalid authentication credentials."}, status_code=401)
    return await call_next(request)


@app.middleware("http")
async def block_audit_read_only_mutations(request: Request, call_next):
    if request.url.path.startswith("/api/") and request.method.upper() in {"POST", "PUT", "PATCH", "DELETE"}:
        if request.url.path != "/api/admin/login":
            auth_header = request.headers.get("authorization", "")
            scheme, _, token = auth_header.partition(" ")
            if scheme.lower() == "bearer" and token:
                try:
                    payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])  # type: ignore[arg-type]
                except Exception:
                    payload = {}
                if payload.get("audit_read_only"):
                    return JSONResponse(
                        content={"detail": "Audit account is read-only. This action cannot modify live data."},
                        status_code=403,
                    )
    return await call_next(request)


@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    response = await call_next(request)
    for header_name in ("server", "x-powered-by"):
        if header_name in response.headers:
            del response.headers[header_name]
    response.headers.setdefault("X-Content-Type-Options", "nosniff")
    response.headers.setdefault("X-Frame-Options", "DENY")
    response.headers.setdefault("X-XSS-Protection", "1; mode=block")
    response.headers.setdefault("Referrer-Policy", "strict-origin-when-cross-origin")
    response.headers.setdefault("Permissions-Policy", "camera=(), microphone=(), geolocation=()")
    response.headers.setdefault("Cross-Origin-Opener-Policy", "same-origin")
    if request.url.scheme == "https":
        response.headers.setdefault("Strict-Transport-Security", "max-age=63072000; includeSubDomains; preload")
    if not request.url.path.startswith(("/gallery_uploads", "/news_uploads", "/unidentified_uploads", "/complaint_uploads")):
        response.headers.setdefault(
            "Content-Security-Policy",
            "default-src 'self'; frame-ancestors 'none'; object-src 'none'; base-uri 'self'",
        )
    return response

# ==================== DATABASE ====================
_is_production = not os.environ.get("DEBUG", "").lower() in ("1", "true", "yes")
engine = create_async_engine(POSTGRES_URL, echo=not _is_production, future=True)
AsyncSessionLocal = sessionmaker(bind=engine, class_=AsyncSession, expire_on_commit=False)  # type: ignore[call-overload]

# ==================== LOGGING ====================
logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)

# ==================== STATIC FILES ====================
# Ensure upload directories exist before mounting
(ROOT_DIR / "gallery_uploads").mkdir(parents=True, exist_ok=True)
(ROOT_DIR / "news_uploads").mkdir(parents=True, exist_ok=True)
(ROOT_DIR / "unidentified_uploads").mkdir(parents=True, exist_ok=True)
(ROOT_DIR / "complaint_uploads").mkdir(parents=True, exist_ok=True)
_ub_json = ROOT_DIR / "unidentified_uploads" / "unidentified_bodies.json"
if not _ub_json.exists():
    _ub_json.write_text("[]", encoding="utf-8")

app.mount("/gallery_uploads", StaticFiles(directory=str(ROOT_DIR / "gallery_uploads")), name="gallery_uploads")
app.mount("/news_uploads", StaticFiles(directory=str(ROOT_DIR / "news_uploads")), name="news_uploads")
app.mount("/unidentified_uploads", StaticFiles(directory=str(ROOT_DIR / "unidentified_uploads")), name="unidentified_uploads")
app.mount("/complaint_uploads", StaticFiles(directory=str(ROOT_DIR / "complaint_uploads")), name="complaint_uploads")

# ==================== ROUTER ====================
api_router = APIRouter(prefix="/api")


# ==================== ORM MODELS ====================
class ComplaintORM(Base):
    __tablename__ = "complaints"
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, nullable=False)
    complainant_name = Column(String, nullable=True)
    complainant_phone = Column(String, nullable=True)
    complaint_type = Column(String, nullable=False)
    description = Column(String, nullable=False)
    location = Column(String, nullable=False)
    station = Column(String, nullable=False)
    incident_date = Column(String, nullable=False)
    address = Column(String, nullable=True)
    state = Column(String, nullable=True)
    complainant_email = Column(String, nullable=True)
    supporting_docs = Column(String, nullable=True)
    evidence_urls = Column(String, nullable=True)
    status = Column(String, default="pending", nullable=False)
    rejection_reason = Column(String, nullable=True)
    tracking_number = Column(String, unique=True, nullable=False, default=lambda: f"GRPAP{uuid.uuid4().hex[:8].upper()}")
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))


class AlertORM(Base):
    __tablename__ = "alerts"
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    alert_type = Column(String, nullable=False)
    title = Column(String, nullable=False)
    description = Column(String, nullable=False)
    priority = Column(String, default="medium", nullable=False)
    is_active = Column(String, default="true", nullable=False)
    target_station = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))


class StationORM(Base):
    __tablename__ = "stations"
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    email = Column(String, unique=True, nullable=False)
    name = Column(String, nullable=False)
    phone = Column(String, nullable=False)
    password = Column(String, nullable=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))


class CrimeDataORM(Base):
    __tablename__ = "crime_data"
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    crime_type = Column(String, nullable=False)
    station = Column(String, nullable=False)
    count = Column(Integer, nullable=False)
    month = Column(String, nullable=False)
    year = Column(Integer, nullable=False)


class HelpRequestORM(Base):
    __tablename__ = "help_requests"
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String, nullable=False)
    phone = Column(String, nullable=False)
    email = Column(String, nullable=False)
    message = Column(String, nullable=False)
    status = Column(String, default="pending", nullable=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    replied = Column(Integer, default=0, nullable=False)  # 0 = False, 1 = True


class HelpRequestReplyORM(Base):
    __tablename__ = "help_request_replies"
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    help_request_id = Column(String, nullable=False)
    reply_message = Column(String, nullable=False)
    recipient_email = Column(String, nullable=False)
    sent_by_id = Column(String, nullable=True)
    sent_by_role = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))


class UnidentifiedBodyORM(Base):
    __tablename__ = "unidentified_bodies"
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    image_url = Column(String, nullable=False)
    image_file_name = Column(String, nullable=False)
    station = Column(String, nullable=False)
    district = Column(String, nullable=True)
    reported_date = Column(String, nullable=False)
    description = Column(String, nullable=False)
    uploaded_by = Column(String, nullable=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))


class LoginAttemptORM(Base):
    __tablename__ = "login_attempts"
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    identifier = Column(String, nullable=False)
    ip_address = Column(String, nullable=False)
    success = Column(Integer, default=0, nullable=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))


class PasswordResetTokenORM(Base):
    __tablename__ = "password_reset_tokens"
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    account_table = Column(String, nullable=True)
    account_id = Column(String, nullable=True)
    email = Column(String, nullable=True)
    purpose = Column(String, default="password_reset", nullable=False)
    otp_hash = Column(String, nullable=False)
    ip_address = Column(String, nullable=False)
    attempts = Column(Integer, default=0, nullable=False)
    used_at = Column(DateTime(timezone=True), nullable=True)
    expires_at = Column(DateTime(timezone=True), nullable=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))


class AuditLogORM(Base):
    __tablename__ = "audit_logs"
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    actor_id = Column(String, nullable=True)
    actor_role = Column(String, nullable=True)
    action = Column(String, nullable=False)
    target_type = Column(String, nullable=True)
    target_id = Column(String, nullable=True)
    ip_address = Column(String, nullable=True)
    details = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))


@app.on_event("startup")
async def ensure_database_tables() -> None:
    core_tables = [
        ComplaintORM.__table__,
        AlertORM.__table__,
        StationORM.__table__,
        CrimeDataORM.__table__,
        HelpRequestORM.__table__,
        HelpRequestReplyORM.__table__,
        UnidentifiedBodyORM.__table__,
        LoginAttemptORM.__table__,
        PasswordResetTokenORM.__table__,
        AuditLogORM.__table__,
    ]
    async with engine.begin() as conn:
        await conn.run_sync(lambda sync_conn: Base.metadata.create_all(sync_conn, tables=core_tables))
        await conn.run_sync(AdminModelBase.metadata.create_all)
    async with AsyncSessionLocal() as session:  # type: ignore[attr-defined]
        await ensure_auth_security_columns(session)


def _normalize_media_url(value: Any) -> str:
    if value is None:
        return ""
    cleaned = str(value).strip().strip('"').strip("'")
    legacy_news_match = re.search(r"/gallery_uploads/news/(.+)$", cleaned, re.IGNORECASE)
    if legacy_news_match:
        return f"/news_uploads/{legacy_news_match.group(1)}"
    match = re.search(r"/(gallery_uploads|news_uploads|unidentified_uploads)/.+$", cleaned, re.IGNORECASE)
    if match:
        return match.group(0)
    return cleaned


def _decode_media_field(value: Any) -> List[str]:
    if value is None:
        return []
    if isinstance(value, list):
        return [str(item).strip() for item in value if str(item).strip()]
    raw = str(value).strip()
    if not raw:
        return []
    try:
        parsed = json.loads(raw)
        if isinstance(parsed, list):
            return [str(item).strip() for item in parsed if str(item).strip()]
    except Exception:
        pass
    return [raw]


def _encode_media_field(items: List[str]) -> str:
    cleaned = [str(item).strip() for item in items if str(item).strip()]
    if not cleaned:
        return ""
    return json.dumps(cleaned) if len(cleaned) > 1 else cleaned[0]


def _merge_unidentified_body_dicts(records: List[dict]) -> List[dict]:
    grouped: dict[str, dict] = {}
    for record in records:
        key = f"{record.get('station', '')}||{record.get('reported_date', '')}||{(record.get('description', '') or '').strip()}"
        if key not in grouped:
            grouped[key] = {**record, "media_urls": [], "ids": []}

        target = grouped[key]
        media_urls = record.get("media_urls") or ([record.get("image_url")] if record.get("image_url") else [])
        for media_url in media_urls:
            normalized = _normalize_media_url(media_url)
            if normalized and normalized not in target["media_urls"]:
                target["media_urls"].append(normalized)

        record_ids = record.get("ids") or ([record.get("id")] if record.get("id") else [])
        for record_id in record_ids:
            if record_id and record_id not in target["ids"]:
                target["ids"].append(record_id)

        if target["media_urls"]:
            target["image_url"] = target["media_urls"][0]

    return list(grouped.values())


def _normalize_news_item(item: Any) -> Any:
    if not isinstance(item, dict):
        return item
    normalized = dict(item)
    if normalized.get("image"):
        normalized["image"] = _normalize_media_url(normalized.get("image"))
    return normalized


def _normalize_gallery_item(item: Any) -> Any:
    if not isinstance(item, dict):
        return item
    normalized = dict(item)
    if normalized.get("url"):
        normalized["url"] = _normalize_media_url(normalized.get("url"))
    if isinstance(normalized.get("images"), list):
        normalized["images"] = [
            {
                **image,
                "url": _normalize_media_url(image.get("url")),
            }
            if isinstance(image, dict)
            else image
            for image in normalized["images"]
        ]
    return normalized


def _gallery_items_from_upload_dir() -> List[dict]:
    uploads_dir = ROOT_DIR / "gallery_uploads"
    gallery_items: List[dict] = []
    for file_path in sorted(uploads_dir.iterdir(), key=lambda p: p.stat().st_mtime, reverse=True):
        if not file_path.is_file():
            continue
        if file_path.suffix.lower() not in {".jpg", ".jpeg", ".png", ".gif", ".webp", ".avif", ".mp4", ".webm", ".ogg", ".mov", ".avi"}:
            continue
        gallery_items.append({
            "id": file_path.stem,
            "heading": f"Gallery Upload - {datetime.fromtimestamp(file_path.stat().st_mtime, tz=timezone.utc).isoformat()}",
            "content": "",
            "images": [{
                "url": f"/gallery_uploads/{file_path.name}",
                "name": file_path.name,
                "storedFileName": file_path.name,
            }],
            "created_at": datetime.fromtimestamp(file_path.stat().st_mtime, tz=timezone.utc).isoformat(),
        })
    return gallery_items


def _news_items_from_upload_dir() -> List[dict]:
    news_dir = ROOT_DIR / "news_uploads"
    if not news_dir.exists():
        return []
    news_items: List[dict] = []
    for file_path in sorted(news_dir.iterdir(), key=lambda p: p.stat().st_mtime, reverse=True):
        if not file_path.is_file():
            continue
        if file_path.suffix.lower() not in {".jpg", ".jpeg", ".png", ".gif", ".webp", ".avif", ".mp4", ".webm", ".ogg", ".mov", ".avi"}:
            continue
        news_items.append({
            "id": file_path.stem,
            "heading": "DAILY NEWS UPDATE",
            "image": f"/news_uploads/{file_path.name}",
            "newsTitle": file_path.stem.replace("_", " ").replace("-", " ").title(),
            "newsSummary": "Latest uploaded news media",
            "date": datetime.fromtimestamp(file_path.stat().st_mtime, tz=timezone.utc).strftime("%d %b %Y"),
            "source": "GRP Andhra Pradesh",
            "created_at": datetime.fromtimestamp(file_path.stat().st_mtime, tz=timezone.utc).isoformat(),
        })
    return news_items


# ==================== PYDANTIC MODELS ====================
class User(BaseModel):
    id: Optional[str] = None
    email: str
    name: str
    phone: Optional[str] = None
    role: str
    created_at: Optional[datetime] = None
    is_read_only: bool = False
    last_login_at: Optional[datetime] = None
    must_change_password: bool = False


class AdminUserView(BaseModel):
    id: str
    email: str
    name: str
    phone: str
    role: str
    created_at: datetime


class AdminLogin(BaseModel):
    identifier: str
    password: str


class AdminLoginVerify(BaseModel):
    reset_id: str
    otp: str
    captcha_id: str
    captcha_answer: str


class AdminPasswordUpdate(BaseModel):
    new_password: str


class PasswordChangeRequest(BaseModel):
    current_password: str
    new_password: str
    otp: str
    captcha_id: str
    captcha_answer: str


class UsernameChangeRequest(BaseModel):
    new_username: EmailStr
    otp: str
    captcha_id: str
    captcha_answer: str


class ProfileNameUpdate(BaseModel):
    name: str


class PasswordResetStartRequest(BaseModel):
    identifier: str
    captcha_id: str
    captcha_answer: str


class PasswordResetCompleteRequest(BaseModel):
    reset_id: str
    otp: str
    new_password: str


class AdminCredentialStatusUpdate(BaseModel):
    is_active: bool


class AdminCredentialCreate(BaseModel):
    scope: str
    email: EmailStr
    name: str
    phone: str = "N/A"
    password: str
    role: Optional[str] = None
    division: Optional[str] = None
    subdivision: Optional[str] = None
    circle: Optional[str] = None
    station_name: Optional[str] = None


class AdminCredentialEntry(BaseModel):
    scope: str
    id: str
    name: str
    email: str
    password: str
    role: str
    must_change_password: bool = False
    is_active: bool = True


class AdminLoginOption(BaseModel):
    identifier: str
    label: str
    scope: str
    account_role: str
    group: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: User


class SRPCredentialCreate(BaseModel):
    name: str
    email: EmailStr
    password: str
    phone: Optional[str] = None


class Complaint(BaseModel):
    model_config = ConfigDict(extra="ignore")  # type: ignore[call-overload]
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    complainant_name: Optional[str] = None
    complainant_phone: Optional[str] = None
    complaint_type: str
    description: str
    location: str
    station: str
    incident_date: str
    address: Optional[str] = None
    state: Optional[str] = None
    complainant_email: Optional[str] = None
    supporting_docs: List[str] = Field(default_factory=list)
    evidence_urls: List[str] = []
    status: str = "pending"
    rejection_reason: Optional[str] = None
    tracking_number: str = Field(default_factory=lambda: f"GRPAP{uuid.uuid4().hex[:8].upper()}")
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class ComplaintCreate(BaseModel):
    complainant_name: str
    complainant_phone: str
    complainant_email: str
    address: str
    state: Optional[str] = None
    complaint_type: str
    description: str
    location: str
    incident_date: str
    evidence_urls: List[str] = []


class ComplaintAssignUpdate(BaseModel):
    station: str


class ComplaintStatusUpdate(BaseModel):
    status: str
    rejection_reason: Optional[str] = None



class UnidentifiedBodyRecord(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    image_url: str
    image_file_name: str
    media_urls: List[str] = Field(default_factory=list)
    ids: List[str] = Field(default_factory=list)
    station: str
    district: Optional[str] = None
    reported_date: str
    description: str
    uploaded_by: str
    created_at: datetime


class Alert(BaseModel):
    model_config = ConfigDict(extra="ignore")  # type: ignore[call-overload]
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    alert_type: str
    title: str
    description: str
    priority: str = "medium"
    is_active: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class AlertCreate(BaseModel):
    alert_type: str
    title: str
    description: str
    priority: str = "medium"


class Station(BaseModel):
    model_config = ConfigDict(extra="ignore")  # type: ignore[call-overload]
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    phone: str
    email: str


class CrimeData(BaseModel):
    model_config = ConfigDict(extra="ignore")  # type: ignore[call-overload]
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    crime_type: str
    station: str
    count: int
    month: str
    year: int


class HelpRequest(BaseModel):
    model_config = ConfigDict(extra="ignore")  # type: ignore[call-overload]
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    phone: str
    email: str
    message: str
    status: str = "pending"
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    replied: bool = False


class HelpRequestCreate(BaseModel):
    name: str
    phone: str
    email: str
    message: str
    captcha_id: str
    captcha_answer: str


class CaptchaChallenge(BaseModel):
    captcha_id: str
    question: str


class ChatMessage(BaseModel):
    model_config = ConfigDict(extra="ignore")  # type: ignore[call-overload]
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    session_id: str
    user_message: str
    bot_response: str
    language: str = "en"
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class ChatRequest(BaseModel):
    message: str
    session_id: str
    language: str = "en"


# ==================== HELPERS ====================
def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(plain_password: str, stored_password: str) -> bool:
    if not stored_password:
        return False
    if stored_password.startswith(("$2a$", "$2b$", "$2y$")):
        try:
            return bcrypt.checkpw(plain_password.encode("utf-8"), stored_password.encode("utf-8"))
        except Exception:
            return False
    return secrets.compare_digest(plain_password, stored_password)


def build_managed_password(role: str, name: str) -> str:
    role_key = str(role or "user").lower()
    role_label = role_key.title()
    tokens = re.findall(r"[a-z0-9]+", str(name or "").lower())
    stopwords = set(PASSWORD_NAME_STOPWORDS)
    if role_key == "dgp":
        role_label = "DGP"
        stopwords.add("dgp")
    filtered_tokens = [t for t in tokens if t not in stopwords]
    if not filtered_tokens:
        filtered_tokens = tokens or [role_key]
    name_label = "".join(t.title() for t in filtered_tokens)
    plain = f"#{role_label}@{name_label}$"
    # Return bcrypt hash of the plain password
    return bcrypt.hashpw(plain.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def is_audit_account(row: Any) -> bool:
    for key in ("id", "email", "name"):
        value = ""
        try:
            value = str(row[key] or "")
        except Exception:
            value = ""
        if value.lower().startswith("audit"):
            return True
    return False


def build_auth_user_payload(
    user_id: str,
    email: str,
    name: str,
    phone: str,
    created_at: Optional[datetime],
    is_read_only: bool = False,
    last_login_at: Optional[datetime] = None,
    must_change_password: bool = False,
) -> Dict[str, Any]:
    return {
        "id": user_id,
        "email": email,
        "name": name,
        "phone": phone or "N/A",
        "role": "officer",
        "created_at": created_at or datetime.now(timezone.utc),
        "is_read_only": is_read_only,
        "last_login_at": last_login_at,
        "must_change_password": must_change_password,
    }


def _send_complaint_email_alert(tracking_number: str, complaint_type: str, station: str, incident_date: str, complainant_name: str = "", complainant_phone: str = "", address: str = "", complainant_email: str = "", location: str = "", description: str = "") -> None:
    """Send email alert to admin when a new complaint is filed. Fails silently if SMTP not configured."""
    if not all([SMTP_HOST, SMTP_USER, SMTP_PASSWORD, ADMIN_ALERT_EMAIL]):
        return
    try:
        msg = email.mime.multipart.MIMEMultipart("alternative")
        msg["Subject"] = f"[GRP Alert] New Complaint Filed – {tracking_number}"
        msg["From"] = SMTP_USER
        msg["To"] = ADMIN_ALERT_EMAIL
        body = (
            f"A new e-Complaint has been filed on the GRP portal.\n"
            f"{'=' * 50}\n\n"
            f"COMPLAINT DETAILS\n"
            f"{'-' * 30}\n"
            f"Complaint No    : {tracking_number}\n"
            f"Complaint Type  : {(complaint_type or '').replace('_', ' ').title()}\n"
            f"Station         : {station}\n"
            f"Location        : {location or 'Not Provided'}\n"
            f"Incident Date   : {incident_date}\n\n"
            f"COMPLAINANT DETAILS\n"
            f"{'-' * 30}\n"
            f"Name            : {complainant_name}\n"
            f"Phone           : {complainant_phone}\n"
            f"Email           : {complainant_email or 'N/A'}\n"
            f"Address         : {address}\n\n"
            f"DESCRIPTION\n"
            f"{'-' * 30}\n"
            f"{description or 'No description provided.'}\n\n"
            f"{'=' * 50}\n"
            f"Please login to the admin panel to review and take action."
        )
        msg.attach(email.mime.text.MIMEText(body, "plain"))
        with smtplib.SMTP(SMTP_HOST, SMTP_PORT, timeout=10) as server:
            server.starttls()
            server.login(SMTP_USER, SMTP_PASSWORD)
            server.sendmail(SMTP_USER, ADMIN_ALERT_EMAIL, msg.as_string())
    except Exception:
        pass  # Email alert is non-critical; do not block complaint submission


def create_access_token(data: Dict[str, Any]) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)  # type: ignore[arg-type]


async def _activate_login_session(
    session: AsyncSession,
    table_name: str,
    user_id: Any,
) -> tuple[str, Optional[datetime]]:
    await ensure_auth_security_columns(session)
    previous_result = await session.execute(
        text(f"SELECT last_login_at FROM {table_name} WHERE id = :id LIMIT 1"),
        {"id": user_id},
    )
    previous = previous_result.mappings().first()
    session_id = uuid.uuid4().hex
    await session.execute(
        text(f"UPDATE {table_name} SET active_session_id = :session_id, last_login_at = :now WHERE id = :id"),
        {"session_id": session_id, "now": datetime.now(timezone.utc), "id": user_id},
    )
    return session_id, previous["last_login_at"] if previous else None


async def _require_active_session(
    session: AsyncSession,
    table_name: str,
    user_id: Any,
    token_session_id: Optional[str],
) -> None:
    await ensure_auth_security_columns(session)
    result = await session.execute(
        text(f"SELECT active_session_id, is_active FROM {table_name} WHERE id = :id LIMIT 1"),
        {"id": user_id},
    )
    row = result.mappings().first()
    if not row or not token_session_id or row["active_session_id"] != token_session_id:
        raise HTTPException(status_code=401, detail="Session is no longer active")
    if int(row["is_active"] if row["is_active"] is not None else 1) != 1:
        raise HTTPException(status_code=403, detail="Account is disabled")


def _normalize_label(value: str) -> str:
    return re.sub(r"[^a-z0-9]+", "", (value or "").lower())


def _digits_only(value: str) -> str:
    return re.sub(r"\D+", "", str(value or ""))


def _format_superior_officer_label(role: str, name: str) -> str:
    cleaned_name = str(name or "").strip()
    # Avoid duplicated superior-rank tokens in labels, e.g.:
    # "DIG DIG Railways" -> "DIG Railways"
    # "ADGP ADGP Railways" -> "ADGP Railways"
    cleaned_name = re.sub(r"^(dgp|adgp|dig)\b[\s:\-_/]*", "", cleaned_name, flags=re.IGNORECASE).strip()
    return f"DGP {cleaned_name}".strip()


def _extract_js_object_literal(content: str, const_name: str) -> Optional[str]:
    marker = f"const {const_name} ="
    marker_index = content.find(marker)
    if marker_index == -1:
        return None
    start_index = content.find("{", marker_index)
    if start_index == -1:
        return None
    depth = 0
    string_delimiter: Optional[str] = None
    escaped = False
    for index in range(start_index, len(content)):
        char = content[index]
        if escaped:
            escaped = False
            continue
        if string_delimiter:
            if char == "\\":
                escaped = True
            elif char == string_delimiter:
                string_delimiter = None
            continue
        if char in {"'", '"'}:
            string_delimiter = char
            continue
        if char == "{":
            depth += 1
        elif char == "}":
            depth -= 1
            if depth == 0:
                return content[start_index : index + 1]
    return None


def _load_frontend_scope_mappings() -> Dict[str, Any]:
    frontend_scope_file = ROOT_DIR.parent / "frontend" / "src" / "lib" / "policeScope.js"
    if not frontend_scope_file.exists():
        return {}
    try:
        content = frontend_scope_file.read_text(encoding="utf-8", errors="ignore")
    except Exception:
        return {}
    mappings: Dict[str, Any] = {}
    for const_name in (
        "IRP_CIRCLE_STATIONS",
        "DSRP_SUBDIVISION_STATIONS",
        "IRP_PHONE_TO_CIRCLE",
        "DSRP_PHONE_TO_SUBDIVISION",
        "SRP_DIVISION_STATIONS",
        "SRP_PHONE_TO_DIVISION",
    ):
        literal = _extract_js_object_literal(content, const_name)
        if not literal:
            continue
        try:
            parsed = ast.literal_eval(literal)
        except Exception:
            continue
        if isinstance(parsed, dict):
            mappings[const_name] = parsed
    return mappings


# ==================== STATION SCOPE DATA ====================
IRP_CIRCLE_STATIONS: Dict[str, List[str]] = {
    "IRP Vijayawada": ["Vijayawada RPS"],
    "Vijayawada Circle": ["Gudivada RPS", "Machilipatnam RPOP", "Eluru RPS"],
    "IRP Guntur": ["Guntur RPS"],
    "Guntur Circle": ["Narasaraopet RPS", "Tenali RPS", "Bapatla RPOP", "Nadikudi RPS", "Repalle RPOP"],
    "IRP Rajahmundry": ["Rajahmundry RPS", "Godavari RPOP"],
    "Kakinada Circle": ["Samalkot RPS", "Kakinada RPOP", "Tuni RPS", "Annavaram RPOP"],
    "Bhimavaram Circle": ["Bhimavaram RPS", "Narsapur RPOP", "Tadepalligudem RPS", "Nidavole RPOP", "Tanuku RPOP"],
    "IRP Visakhapatnam": ["Visakhapatnam RPS", "Duvvada RPOP"],
    "Visakhapatnam Circle": ["Vizianagaram RPS", "Parvathipuram RPOP", "Bobbili RPOP", "Palasa RPS", "Srikakulam RPOP"],
    "Guntakal Circle": ["Guntakal RPS", "Gooty RPS", "Tadipatri RPOP", "Adoni RPS", "Rayadurgam RPOP", "Mantralayam RPOP"],
    "Kurnool Circle": ["Kurnool RPS", "Dhone RPOP", "Nandyal RPS", "Markapuram RPOP"],
    "Dharmavaram Circle": ["Dharmavaram RPS", "Anantapuramu RPS", "Hindupuramu RPS", "SSSPN RS RPOP", "Kadiri RPS", "Puttaparthi RPOP"],
    "Tirupati Circle": ["Tirupati RPS"],
    "Renigunta Circle": ["Renigunta RPS", "Chittoor RPS", "Puttur RPOP", "Srikalahasti RPOP", "Pakala RPOP", "Kuppam RPOP"],
    "Kadapa Circle": ["Kadapa RPS", "Yerraguntla RPS", "Nandalur RPOP"],
    "Nellore Circle": ["Nellore RPS", "Gudur RPS", "Sullurupeta RPOP", "Kavali RPS", "Krishnapatnam Port RPOP", "Bitragunta RPOP"],
    "Ongole Circle": ["Ongole RPS", "Chirala RPS", "Singarayakonda RPOP"],
}

IRP_PHONE_TO_CIRCLE: Dict[str, str] = {
    # Vijayawada Division
    "9247585710": "IRP Vijayawada",       # IRP Vijayawada RPS
    "9247585711": "Vijayawada Circle",    # IRP Vijayawada Circle
    "9247585716": "IRP Guntur",           # IRP Guntur RPS
    "9247585717": "Guntur Circle",        # IRP Guntur Circle
    "9247585726": "IRP Rajahmundry",      # IRP Rajahmundry RPS
    "9247585727": "Kakinada Circle",      # IRP Kakinada Circle
    "9247585728": "Bhimavaram Circle",    # IRP Bhimavaram Circle
    "9247585737": "IRP Visakhapatnam",    # IRP Visakhapatnam RPS
    "9247585738": "Visakhapatnam Circle",  # IRP Visakhapatnam Circle
    # Guntakal Division
    "9247575604": "Guntakal Circle",      # IRP Guntakal Circle
    "9247575608": "Kurnool Circle",       # IRP Kurnool Circle
    "9247575612": "Dharmavaram Circle",   # IRP Dharmavaram Circle
    "9247575618": "Tirupati Circle",      # IRP Tirupati Circle
    "9247575620": "Renigunta Circle",     # IRP Renigunta Circle
    "9247575623": "Kadapa Circle",        # IRP Kadapa Circle
    "9247575627": "Nellore Circle",       # IRP Nellore Circle
    "9247575631": "Ongole Circle",        # IRP Ongole Circle
}

DSRP_SUBDIVISION_STATIONS: Dict[str, List[str]] = {
    "Vijayawada Sub Division": ["Vijayawada RPS", "Gudivada RPS", "Machilipatnam RPOP", "Eluru RPS"],
    "Guntur Sub Division": ["Guntur RPS", "Narasaraopet RPS", "Tenali RPS", "Bapatla RPOP", "Nadikudi RPS", "Repalle RPOP"],
    "Rajahmundry Sub Division": ["Rajahmundry RPS", "Samalkot RPS", "Kakinada RPOP", "Tuni RPS", "Godavari RPOP", "Annavaram RPOP", "Bhimavaram RPS", "Tadepalligudem RPS", "Nidavole RPOP", "Narsapur RPOP", "Tanuku RPOP"],
    "Visakhapatnam Sub Division": ["Visakhapatnam RPS", "Duvvada RPOP", "Vizianagaram RPS", "Parvathipuram RPOP", "Bobbili RPOP", "Palasa RPS", "Srikakulam RPOP"],
    "Guntakal Sub Division": ["Guntakal RPS", "Gooty RPS", "Adoni RPS", "Kurnool RPS", "Dhone RPOP", "Nandyal RPS", "Mantralayam RPOP", "Anantapuramu RPS", "Dharmavaram RPS", "Hindupuramu RPS", "Kadiri RPS", "Rayadurgam RPOP", "Tadipatri RPOP", "Markapuram RPOP", "Puttaparthi RPOP", "SSSPN RS RPOP"],
    "Tirupati Sub Division": ["Tirupati RPS", "Renigunta RPS", "Chittoor RPS", "Kadapa RPS", "Yerraguntla RPS", "Puttur RPOP", "Srikalahasti RPOP", "Pakala RPOP", "Kuppam RPOP", "Nandalur RPOP"],
    "Nellore Sub Division": ["Nellore RPS", "Gudur RPS", "Kavali RPS", "Ongole RPS", "Chirala RPS", "Krishnapatnam Port RPOP", "Sullurupeta RPOP", "Bitragunta RPOP", "Singarayakonda RPOP"],
}

DSRP_PHONE_TO_SUBDIVISION: Dict[str, str] = {
    "9247585709": "Vijayawada Sub Division", "9247585715": "Guntur Sub Division",
    "9247585725": "Rajahmundry Sub Division", "9247585736": "Visakhapatnam Sub Division",
    "9247575603": "Guntakal Sub Division", "9247575617": "Tirupati Sub Division",
    "9247575626": "Nellore Sub Division",
}

SRP_DIVISION_STATIONS: Dict[str, List[str]] = {
    "Vijayawada Division": [
        "Vijayawada RPS", "Gudivada RPS", "Machilipatnam RPOP", "Eluru RPS",
        "Guntur RPS", "Narasaraopet RPS", "Tenali RPS", "Bapatla RPOP", "Nadikudi RPS", "Repalle RPOP",
        "Rajahmundry RPS", "Samalkot RPS", "Kakinada RPOP", "Tuni RPS", "Godavari RPOP", "Annavaram RPOP",
        "Bhimavaram RPS", "Tadepalligudem RPS", "Nidavole RPOP", "Narsapur RPOP", "Tanuku RPOP",
        "Visakhapatnam RPS", "Duvvada RPOP", "Vizianagaram RPS", "Parvathipuram RPOP", "Bobbili RPOP",
        "Palasa RPS", "Srikakulam RPOP",
    ],
    "Guntakal Division": [
        "Guntakal RPS", "Gooty RPS", "Adoni RPS", "Kurnool RPS", "Dhone RPOP", "Nandyal RPS",
        "Mantralayam RPOP", "Anantapuramu RPS", "Dharmavaram RPS", "Hindupuramu RPS", "Kadiri RPS",
        "Rayadurgam RPOP", "Tadipatri RPOP", "Markapuram RPOP", "Puttaparthi RPOP", "SSSPN RS RPOP",
        "Tirupati RPS", "Renigunta RPS", "Chittoor RPS", "Kadapa RPS", "Yerraguntla RPS", "Puttur RPOP",
        "Srikalahasti RPOP", "Pakala RPOP", "Kuppam RPOP", "Nandalur RPOP",
        "Nellore RPS", "Gudur RPS", "Kavali RPS", "Ongole RPS", "Chirala RPS",
        "Krishnapatnam Port RPOP", "Sullurupeta RPOP", "Bitragunta RPOP", "Singarayakonda RPOP",
    ],
}

SRP_PHONE_TO_DIVISION: Dict[str, str] = {
    "9247585800": "Vijayawada Division",
    "9247575601": "Guntakal Division",
}

SRP_ALLOWED_NAMES = ["SRP Vijayawada", "SRP Guntakal"]

# Override with frontend mappings if available
_FRONTEND_SCOPE_MAPPINGS = _load_frontend_scope_mappings()
IRP_CIRCLE_STATIONS = _FRONTEND_SCOPE_MAPPINGS.get("IRP_CIRCLE_STATIONS", IRP_CIRCLE_STATIONS)  # type: ignore[assignment]
DSRP_SUBDIVISION_STATIONS = _FRONTEND_SCOPE_MAPPINGS.get("DSRP_SUBDIVISION_STATIONS", DSRP_SUBDIVISION_STATIONS)  # type: ignore[assignment]
IRP_PHONE_TO_CIRCLE = _FRONTEND_SCOPE_MAPPINGS.get("IRP_PHONE_TO_CIRCLE", IRP_PHONE_TO_CIRCLE)  # type: ignore[assignment]
DSRP_PHONE_TO_SUBDIVISION = _FRONTEND_SCOPE_MAPPINGS.get("DSRP_PHONE_TO_SUBDIVISION", DSRP_PHONE_TO_SUBDIVISION)  # type: ignore[assignment]
SRP_DIVISION_STATIONS = _FRONTEND_SCOPE_MAPPINGS.get("SRP_DIVISION_STATIONS", SRP_DIVISION_STATIONS)  # type: ignore[assignment]
SRP_PHONE_TO_DIVISION = _FRONTEND_SCOPE_MAPPINGS.get("SRP_PHONE_TO_DIVISION", SRP_PHONE_TO_DIVISION)  # type: ignore[assignment]


# ==================== SCOPE HELPERS ====================
def _managed_station_names_for_irp(current_user: User) -> List[str]:
    normalized_name = _normalize_label(current_user.name)
    # Strip leading "irp" prefix so "IRP Guntakal Circle" matches key "Guntakal Circle"
    normalized_name_stripped = normalized_name[3:] if normalized_name.startswith("irp") else normalized_name
    managed_circles: List[str] = []
    for circle_name in IRP_CIRCLE_STATIONS.keys():
        norm_circle = _normalize_label(circle_name)
        if norm_circle == normalized_name or norm_circle == normalized_name_stripped:
            managed_circles.append(circle_name)
    phone_digits = _digits_only(current_user.phone or "")
    if phone_digits:
        mapped = IRP_PHONE_TO_CIRCLE.get(phone_digits)
        if mapped and mapped not in managed_circles:
            managed_circles.append(mapped)
    if not managed_circles:
        return []
    stations: List[str] = []
    for circle in managed_circles:
        for s in IRP_CIRCLE_STATIONS.get(circle, []):
            if s not in stations and not s.upper().endswith("RPOP"):
                stations.append(s)
    return stations


def _managed_station_names_for_dsrp(current_user: User) -> List[str]:
    normalized_name = _normalize_label(current_user.name)
    managed_subdivisions: List[str] = []
    for subdivision in DSRP_SUBDIVISION_STATIONS.keys():
        if _normalize_label(subdivision) == normalized_name:
            managed_subdivisions.append(subdivision)
    phone_digits = _digits_only(current_user.phone or "")
    if phone_digits:
        mapped = DSRP_PHONE_TO_SUBDIVISION.get(phone_digits)
        if mapped and mapped not in managed_subdivisions:
            managed_subdivisions.append(mapped)
    if not managed_subdivisions:
        return []
    stations: List[str] = []
    for sub in managed_subdivisions:
        for s in DSRP_SUBDIVISION_STATIONS.get(sub, []):
            if s not in stations:
                stations.append(s)
    return stations


def _managed_station_names_for_srp(current_user: User) -> List[str]:
    normalized_name = _normalize_label(current_user.name)
    managed_divisions: List[str] = []
    if "vijayawada" in normalized_name:
        managed_divisions.append("Vijayawada Division")
    if "guntakal" in normalized_name:
        managed_divisions.append("Guntakal Division")
    phone_digits = _digits_only(current_user.phone or "")
    if phone_digits:
        mapped = SRP_PHONE_TO_DIVISION.get(phone_digits)
        if mapped and mapped not in managed_divisions:
            managed_divisions.append(mapped)
    if not managed_divisions:
        return []
    stations: List[str] = []
    for div in managed_divisions:
        for s in SRP_DIVISION_STATIONS.get(div, []):
            if s not in stations:
                stations.append(s)
    return stations


def _is_dgp_user(current_user: User) -> bool:
    if current_user.role not in ("police", "dgp"):
        return False
    normalized_name = _normalize_label(current_user.name)
    return any(token in normalized_name for token in ("adgp", "dgp", "dig", "directorgeneral", "deputyinspectorgeneral"))



async def _resolve_station_for_user(session: AsyncSession, current_user: User) -> Optional[StationORM]:
    if current_user.role not in ("police", "station"):
        return None
    normalized_user_name = _normalize_label(current_user.name)
    normalized_user_phone = _digits_only(current_user.phone or "")
    result = await session.execute(select(StationORM))
    stations = result.scalars().all()
    for station in stations:
        if _normalize_label(str(station.name)) == normalized_user_name:
            return station
    for station in stations:
        normalized_station_name = _normalize_label(str(station.name))
        if normalized_user_name and (
            normalized_user_name in normalized_station_name or normalized_station_name in normalized_user_name
        ):
            return station
    for station in stations:
        normalized_station_phone = _digits_only(str(station.phone))
        if normalized_user_phone and normalized_station_phone and (
            normalized_user_phone in normalized_station_phone or normalized_station_phone in normalized_user_phone
        ):
            return station
    return None


# ==================== DB HELPERS ====================
async def ensure_officer_credentials_table(session: AsyncSession) -> None:
    pass


async def ensure_complaints_table_columns(session: AsyncSession) -> None:
    await session.execute(
        text("ALTER TABLE complaints ADD COLUMN IF NOT EXISTS rejection_reason VARCHAR")
    )
    await session.execute(
        text("ALTER TABLE complaints ADD COLUMN IF NOT EXISTS complainant_name VARCHAR")
    )
    await session.execute(
        text("ALTER TABLE complaints ADD COLUMN IF NOT EXISTS complainant_phone VARCHAR")
    )
    await session.execute(
        text("ALTER TABLE complaints DROP COLUMN IF EXISTS aadhar_number")
    )
    await session.execute(
        text("ALTER TABLE complaints ADD COLUMN IF NOT EXISTS address VARCHAR")
    )
    await session.execute(
        text("ALTER TABLE complaints ADD COLUMN IF NOT EXISTS state VARCHAR")
    )
    await session.execute(
        text("ALTER TABLE complaints ADD COLUMN IF NOT EXISTS complainant_email VARCHAR")
    )
    await session.execute(
        text("ALTER TABLE complaints ADD COLUMN IF NOT EXISTS supporting_docs VARCHAR")
    )
    await session.commit()


async def ensure_auth_security_columns(session: AsyncSession) -> None:
    for table_name in ("admin", "dgp", "srp", "dsrp", "irp", "stations"):
        await session.execute(text(f"ALTER TABLE {table_name} ADD COLUMN IF NOT EXISTS active_session_id VARCHAR"))
        await session.execute(text(f"ALTER TABLE {table_name} ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMP WITH TIME ZONE"))
        await session.execute(text(f"ALTER TABLE {table_name} ADD COLUMN IF NOT EXISTS must_change_password INTEGER DEFAULT 0"))
        await session.execute(text(f"ALTER TABLE {table_name} ADD COLUMN IF NOT EXISTS is_active INTEGER DEFAULT 1"))
        await session.execute(text(f"ALTER TABLE {table_name} ADD COLUMN IF NOT EXISTS role VARCHAR"))
        await session.execute(text(f"ALTER TABLE {table_name} ADD COLUMN IF NOT EXISTS division VARCHAR"))
        await session.execute(text(f"ALTER TABLE {table_name} ADD COLUMN IF NOT EXISTS subdivision VARCHAR"))
        await session.execute(text(f"ALTER TABLE {table_name} ADD COLUMN IF NOT EXISTS circle VARCHAR"))
        await session.execute(text(f"ALTER TABLE {table_name} ADD COLUMN IF NOT EXISTS station_name VARCHAR"))
    await session.execute(text("ALTER TABLE password_reset_tokens ADD COLUMN IF NOT EXISTS purpose VARCHAR DEFAULT 'password_reset'"))
    await session.execute(text("UPDATE password_reset_tokens SET purpose = 'password_reset' WHERE purpose IS NULL OR purpose = ''"))
    await session.execute(text("UPDATE dgp SET role = 'dgp' WHERE lower(COALESCE(role, '')) IN ('adgp', 'dig')"))
    await session.execute(
        text(
            """
            CREATE TABLE IF NOT EXISTS password_history (
                id VARCHAR PRIMARY KEY,
                account_table VARCHAR NOT NULL,
                account_id VARCHAR NOT NULL,
                password_hash VARCHAR NOT NULL,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            )
            """
        )
    )
    await session.execute(
        text("CREATE INDEX IF NOT EXISTS idx_password_history_account ON password_history(account_table, account_id, created_at DESC)")
    )
    await session.commit()


async def ensure_admin_password_patterns(session: AsyncSession) -> None:
    admin_result = await session.execute(text("SELECT id, name, password FROM admin"))
    admins = admin_result.mappings().all()
    for admin in admins:
        if admin["password"]:
            continue
        admin_name = str(admin["name"] or admin["id"] or "central admin")
        if admin_name.strip().lower() in {"admin", "administrator"}:
            admin_name = "Central admin"
        plain_password = build_managed_password("admin", admin_name)
        await session.execute(
            text("UPDATE admin SET password = :password WHERE id = :id"),
            {"password": plain_password, "id": admin["id"]},
        )
    await session.commit()


# ==================== DB SESSION DEPENDENCY ====================
async def get_async_session(request: Request):  # type: ignore[misc]
    async with AsyncSessionLocal() as session:  # type: ignore[attr-defined]
        yield session


def _client_ip(request: Request) -> str:
    forwarded_for = request.headers.get("x-forwarded-for", "")
    if forwarded_for:
        return forwarded_for.split(",", 1)[0].strip()[:64]
    return (request.client.host if request.client else "unknown")[:64]


def enforce_public_submission_rate_limit(request: Request, route_key: str) -> None:
    key = f"{route_key}:{_client_ip(request)}"
    now = time.time()
    attempts = [ts for ts in _public_submission_attempts[key] if now - ts < PUBLIC_SUBMISSION_WINDOW_SECONDS]
    if len(attempts) >= PUBLIC_SUBMISSION_MAX_ATTEMPTS:
        _public_submission_attempts[key] = attempts
        raise HTTPException(status_code=429, detail="Too many submissions. Please try again later.")
    attempts.append(now)
    _public_submission_attempts[key] = attempts


def _cleanup_captcha_challenges() -> None:
    now = time.time()
    expired = [cid for cid, data in _captcha_challenges.items() if data.get("expires_at", 0) < now]
    for cid in expired:
        _captcha_challenges.pop(cid, None)


def verify_captcha(captcha_id: str, captcha_answer: str) -> None:
    _cleanup_captcha_challenges()
    challenge = _captcha_challenges.pop(str(captcha_id or ""), None)
    if not challenge:
        raise HTTPException(status_code=400, detail="Security challenge expired. Please try again.")
    expected = str(challenge.get("answer", ""))
    supplied = str(captcha_answer or "").strip()
    if not supplied or not secrets.compare_digest(expected, supplied):
        raise HTTPException(status_code=400, detail="Security challenge answer is incorrect.")


def _token_table_from_payload(payload: Dict[str, Any]) -> tuple[Optional[str], Optional[Any]]:
    if payload.get("is_admin") and payload.get("admin_id"):
        return "admin", payload.get("admin_id")
    if payload.get("officer_id"):
        return "dgp", payload.get("officer_id")
    if payload.get("station_id"):
        return "stations", payload.get("station_id")
    cred_role = str(payload.get("cred_role") or "")
    if payload.get("cred_id") and cred_role in {"srp", "dsrp", "irp"}:
        return cred_role, payload.get("cred_id")
    return None, None


async def enforce_login_rate_limit(session: AsyncSession, identifier: str, ip_address: str) -> None:
    cutoff = datetime.now(timezone.utc) - timedelta(seconds=LOGIN_WINDOW_SECONDS)
    result = await session.execute(
        text(
            """
            SELECT count(*) FROM login_attempts
            WHERE success = 0
              AND created_at > :cutoff
              AND (ip_address = :ip_address OR lower(identifier) = :identifier)
            """
        ),
        {"cutoff": cutoff, "ip_address": ip_address, "identifier": identifier.lower()},
    )
    failed_count = int(result.scalar() or 0)
    if failed_count >= LOGIN_MAX_ATTEMPTS:
        raise HTTPException(status_code=429, detail="Too many login attempts. Please try again later.")


async def record_login_attempt(session: AsyncSession, identifier: str, ip_address: str, success: bool) -> None:
    await session.execute(
        text(
            """
            INSERT INTO login_attempts (id, identifier, ip_address, success, created_at)
            VALUES (:id, :identifier, :ip_address, :success, :created_at)
            """
        ),
        {
            "id": str(uuid.uuid4()),
            "identifier": identifier[:255],
            "ip_address": ip_address,
            "success": 1 if success else 0,
            "created_at": datetime.utcnow(),
        },
    )
    if success:
        await session.execute(
            text("DELETE FROM login_attempts WHERE success = 0 AND (ip_address = :ip_address OR lower(identifier) = :identifier)"),
            {"ip_address": ip_address, "identifier": identifier.lower()},
        )
    await session.commit()


def enforce_password_reset_rate_limit(request: Request, identifier: str) -> None:
    key = f"{_client_ip(request)}:{str(identifier or '').strip().lower()[:120]}"
    now = time.time()
    attempts = [ts for ts in _password_reset_attempts[key] if now - ts < PASSWORD_RESET_WINDOW_SECONDS]
    if len(attempts) >= PASSWORD_RESET_MAX_ATTEMPTS:
        _password_reset_attempts[key] = attempts
        raise HTTPException(status_code=429, detail="Too many reset requests. Please try again later.")
    attempts.append(now)
    _password_reset_attempts[key] = attempts


def _hash_reset_otp(reset_id: str, otp: str) -> str:
    payload = f"{SECRET_KEY}:{reset_id}:{otp}".encode("utf-8")
    return hashlib.sha256(payload).hexdigest()


def _mask_email(email_address: str) -> str:
    local, _, domain = str(email_address or "").partition("@")
    if not local or not domain:
        return "the registered email"
    visible = local[:2] if len(local) > 2 else local[:1]
    return f"{visible}{'*' * max(3, len(local) - len(visible))}@{domain}"


async def _find_reset_account(session: AsyncSession, identifier: str) -> Optional[Dict[str, str]]:
    cleaned = str(identifier or "").strip()
    if not cleaned:
        return None
    safe_tables = ("admin", "dgp", "srp", "dsrp", "irp", "stations")
    for table_name in safe_tables:
        result = await session.execute(
            text(
                f"""
                SELECT id, email, name, password
                FROM {table_name}
                WHERE lower(email) = :identifier OR lower(id) = :identifier OR lower(name) = :identifier
                LIMIT 1
                """
            ),
            {"identifier": cleaned.lower()},
        )
        row = result.mappings().first()
        if row and row["email"]:
            return {
                "table": table_name,
                "id": str(row["id"]),
                "email": str(row["email"]),
                "name": str(row["name"] or "User"),
                "password": str(row["password"] or ""),
            }
    return None


def _send_password_reset_otp(email_address: str, display_name: str, otp: str) -> None:
    if not all([SMTP_HOST, SMTP_USER, SMTP_PASSWORD]):
        raise HTTPException(status_code=503, detail="Password reset email is not configured.")
    try:
        msg = email.mime.multipart.MIMEMultipart("alternative")
        msg["Subject"] = "[GRP AP] Password Reset OTP"
        msg["From"] = SMTP_USER
        msg["To"] = email_address
        body = (
            f"Dear {display_name or 'User'},\n\n"
            f"Your GRP portal password reset OTP is: {otp}\n\n"
            f"This OTP is valid for {PASSWORD_RESET_OTP_EXPIRY_MINUTES} minutes. "
            f"If you did not request this reset, please ignore this email and contact your administrator.\n\n"
            f"Regards,\nGRP Police Administration"
        )
        msg.attach(email.mime.text.MIMEText(body, "plain"))
        with smtplib.SMTP(SMTP_HOST, SMTP_PORT, timeout=10) as server:
            server.starttls()
            server.login(SMTP_USER, SMTP_PASSWORD)
            server.sendmail(SMTP_USER, email_address, msg.as_string())
    except HTTPException:
        raise
    except Exception as exc:
        logger.warning("Password reset OTP email failed for %s: %s", email_address, exc)
        raise HTTPException(status_code=502, detail="Failed to send reset OTP. Please try again later.") from exc


def _send_security_notification(email_address: str, display_name: str, subject: str, body: str) -> None:
    if not all([SMTP_HOST, SMTP_USER, SMTP_PASSWORD]) or not email_address:
        return
    try:
        msg = email.mime.multipart.MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = SMTP_USER
        msg["To"] = email_address
        msg.attach(email.mime.text.MIMEText(body, "plain"))
        with smtplib.SMTP(SMTP_HOST, SMTP_PORT, timeout=10) as server:
            server.starttls()
            server.login(SMTP_USER, SMTP_PASSWORD)
            server.sendmail(SMTP_USER, email_address, msg.as_string())
    except Exception as exc:
        logger.warning("Security notification email failed for %s: %s", email_address, exc)


def validate_strong_password(plain_password: str) -> None:
    if len(plain_password) < 12:
        raise HTTPException(status_code=400, detail="Password must be at least 12 characters")
    if any(ch.isspace() for ch in plain_password):
        raise HTTPException(status_code=400, detail="Password cannot contain spaces")
    checks = [
        (r"[A-Z]", "one uppercase letter"),
        (r"[a-z]", "one lowercase letter"),
        (r"\d", "one number"),
        (r"[^A-Za-z0-9]", "one special character"),
    ]
    missing = [label for pattern, label in checks if not re.search(pattern, plain_password)]
    if missing:
        raise HTTPException(status_code=400, detail=f"Password must include {', '.join(missing)}")


async def _ensure_password_not_recently_used(
    session: AsyncSession,
    account_table: str,
    account_id: Any,
    plain_password: str,
    current_hash: str = "",
) -> None:
    if current_hash and verify_password(plain_password, current_hash):
        raise HTTPException(status_code=400, detail="New password was used recently. Please choose a different password.")
    await ensure_auth_security_columns(session)
    result = await session.execute(
        text(
            """
            SELECT password_hash
            FROM password_history
            WHERE account_table = :account_table AND account_id = :account_id
            ORDER BY created_at DESC
            LIMIT :limit
            """
        ),
        {"account_table": account_table, "account_id": str(account_id), "limit": PASSWORD_HISTORY_LIMIT},
    )
    for row in result.mappings().all():
        if verify_password(plain_password, str(row["password_hash"] or "")):
            raise HTTPException(status_code=400, detail="New password was used recently. Please choose a different password.")


async def _remember_password_hash(session: AsyncSession, account_table: str, account_id: Any, password_hash: str) -> None:
    await ensure_auth_security_columns(session)
    await session.execute(
        text(
            """
            INSERT INTO password_history (id, account_table, account_id, password_hash, created_at)
            VALUES (:id, :account_table, :account_id, :password_hash, :created_at)
            """
        ),
        {
            "id": str(uuid.uuid4()),
            "account_table": account_table,
            "account_id": str(account_id),
            "password_hash": password_hash,
            "created_at": datetime.utcnow(),
        },
    )
    await session.execute(
        text(
            """
            DELETE FROM password_history
            WHERE id IN (
                SELECT id
                FROM password_history
                WHERE account_table = :account_table AND account_id = :account_id
                ORDER BY created_at DESC
                OFFSET :limit
            )
            """
        ),
        {"account_table": account_table, "account_id": str(account_id), "limit": PASSWORD_HISTORY_LIMIT},
    )


def _safe_upload_extension(filename: Optional[str]) -> str:
    name = Path(filename or "").name
    suffixes = [suffix.lower() for suffix in Path(name).suffixes]
    if not suffixes:
        raise HTTPException(status_code=400, detail="Uploaded file must include an extension")
    executable_suffixes = {".html", ".htm", ".php", ".phtml", ".phar", ".jsp", ".asp", ".aspx", ".js", ".svg", ".exe", ".sh", ".bat", ".cmd"}
    if any(suffix in executable_suffixes for suffix in suffixes):
        raise HTTPException(status_code=400, detail="Executable or active-content files are not allowed")
    return suffixes[-1]


def _content_matches_mime(content: bytes, content_type: str) -> bool:
    head = content[:512]
    stripped = head.lstrip().lower()
    if stripped.startswith((b"<html", b"<!doctype html", b"<?php", b"<script", b"<?xml")):
        return False
    if content_type == "application/pdf":
        return head.startswith(b"%PDF-")
    if content_type == "image/jpeg":
        return head.startswith(b"\xff\xd8\xff")
    if content_type == "image/png":
        return head.startswith(b"\x89PNG\r\n\x1a\n")
    if content_type == "image/gif":
        return head.startswith((b"GIF87a", b"GIF89a"))
    if content_type == "image/webp":
        return len(head) >= 12 and head[:4] == b"RIFF" and head[8:12] == b"WEBP"
    if content_type in {"video/mp4", "video/quicktime"}:
        return b"ftyp" in head[:32]
    if content_type == "video/webm":
        return head.startswith(b"\x1a\x45\xdf\xa3")
    if content_type == "video/ogg":
        return head.startswith(b"OggS")
    if content_type == "video/x-msvideo":
        return head.startswith(b"RIFF") and head[8:12] == b"AVI "
    return False


async def _read_validated_upload(
    upload: UploadFile,
    allowed_mime_extensions: Dict[str, set],
    media_label: str,
) -> tuple[bytes, str]:
    ext = _safe_upload_extension(upload.filename)
    content_type = (upload.content_type or "").lower()
    allowed_extensions = allowed_mime_extensions.get(content_type)
    if not allowed_extensions or ext not in allowed_extensions:
        raise HTTPException(status_code=400, detail=f"Only approved {media_label} file types are allowed")
    content = await upload.read()
    if len(content) > MAX_UPLOAD_SIZE_BYTES:
        raise HTTPException(status_code=400, detail="File size exceeds 5 MB limit")
    if not _content_matches_mime(content, content_type):
        raise HTTPException(status_code=400, detail="Uploaded file content does not match its declared type")
    return content, ext


def _validate_incident_date(value: str) -> str:
    raw = str(value or "").strip()
    try:
        parsed = datetime.strptime(raw, "%Y-%m-%d").date()
    except ValueError:
        raise HTTPException(status_code=400, detail="Incident date must be in YYYY-MM-DD format")
    if parsed > datetime.now(timezone.utc).date():
        raise HTTPException(status_code=400, detail="Incident date cannot be in the future")
    return raw


def _ensure_status_can_change(current_status: str, next_status: str) -> None:
    current = str(current_status or "").strip().lower()
    if current in TERMINAL_COMPLAINT_STATUSES and next_status != current:
        raise HTTPException(status_code=409, detail="Complaint is already in a final state")


async def write_audit_log(
    session: AsyncSession,
    current_user: User,
    request: Request,
    action: str,
    target_type: str,
    target_id: str,
    details: Optional[Dict[str, Any]] = None,
) -> None:
    await session.execute(
        text(
            """
            INSERT INTO audit_logs (id, actor_id, actor_role, action, target_type, target_id, ip_address, details, created_at)
            VALUES (:id, :actor_id, :actor_role, :action, :target_type, :target_id, :ip_address, :details, :created_at)
            """
        ),
        {
            "id": str(uuid.uuid4()),
            "actor_id": current_user.id,
            "actor_role": current_user.role,
            "action": action,
            "target_type": target_type,
            "target_id": target_id,
            "ip_address": _client_ip(request),
            "details": json.dumps(details or {}, ensure_ascii=False),
            "created_at": datetime.utcnow(),
        },
    )


# ==================== AUTH ====================
async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    session: AsyncSession = Depends(get_async_session),
) -> User:
    try:
        token = credentials.credentials
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])  # type: ignore[arg-type]
        audit_read_only = bool(payload.get("audit_read_only"))
        token_session_id = payload.get("sid")

        if payload.get("is_admin"):
            admin_id = payload.get("admin_id")
            if admin_id is None:
                raise HTTPException(status_code=401, detail="Invalid authentication credentials")
            await _require_active_session(session, "admin", admin_id, token_session_id)
            admin_result = await session.execute(
                text("SELECT id, email, name, phone, created_at, last_login_at, must_change_password FROM admin WHERE id = :id LIMIT 1"),
                {"id": admin_id},
            )
            admin = admin_result.mappings().first()
            if admin is None:
                raise HTTPException(status_code=401, detail="Admin not found")
            return User(
                id=str(admin["id"]),
                email=admin["email"],
                name=str(admin["name"]),
                phone=str(admin["phone"] or "N/A"),
                role="admin",
                created_at=admin["created_at"] or datetime.now(timezone.utc),
                is_read_only=audit_read_only,
                last_login_at=admin["last_login_at"],
                must_change_password=bool(admin["must_change_password"]),
            )

        officer_id = payload.get("officer_id")
        if officer_id:
            await ensure_officer_credentials_table(session)
            await _require_active_session(session, "dgp", officer_id, token_session_id)
            officer_result = await session.execute(
                text("SELECT id, email, name, phone, created_at, last_login_at, must_change_password FROM dgp WHERE id = :id LIMIT 1"),
                {"id": officer_id},
            )
            officer = officer_result.mappings().first()
            if officer is None:
                raise HTTPException(status_code=401, detail="Officer not found")
            return User(
                id=str(officer["id"]),
                email=officer["email"],
                name=str(officer["name"]),
                phone=str(officer["phone"] or "N/A"),
                role="dgp",
                created_at=officer["created_at"] or datetime.now(timezone.utc),
                is_read_only=audit_read_only,
                last_login_at=officer["last_login_at"],
                must_change_password=bool(officer["must_change_password"]),
            )

        station_id = payload.get("station_id")
        if station_id:
            await _require_active_session(session, "stations", station_id, token_session_id)
            station_result = await session.execute(
                text("SELECT id, email, name, phone, created_at, last_login_at, must_change_password FROM stations WHERE id = :id LIMIT 1"),
                {"id": station_id},
            )
            station = station_result.mappings().first()
            if station is None:
                raise HTTPException(status_code=401, detail="Station not found")
            return User(
                id=str(station["id"]),
                email=station["email"],
                name=str(station["name"]),
                phone=str(station["phone"] or "N/A"),
                role="station",
                created_at=station["created_at"] or datetime.now(timezone.utc),
                is_read_only=audit_read_only,
                last_login_at=station["last_login_at"],
                must_change_password=bool(station["must_change_password"]),
            )

        cred_id = payload.get("cred_id")
        cred_role = payload.get("cred_role")
        if cred_id and cred_role:
            table_map = {"srp": "srp", "dsrp": "dsrp", "irp": "irp"}
            cred_table = table_map.get(str(cred_role))
            if cred_table is None:
                raise HTTPException(status_code=401, detail="Invalid credential role")
            await _require_active_session(session, cred_table, cred_id, token_session_id)
            cred_result = await session.execute(
                text(f"SELECT id, email, name, phone, created_at, last_login_at, must_change_password FROM {cred_table} WHERE id = :id LIMIT 1"),
                {"id": cred_id},
            )
            cred = cred_result.mappings().first()
            if cred is None:
                raise HTTPException(status_code=401, detail=f"{cred_role.upper()} credential not found")
            return User(
                id=str(cred["id"]),
                email=cred["email"],
                name=str(cred["name"]),
                phone=str(cred["phone"] or "N/A"),
                role=str(cred_role),
                created_at=cred["created_at"] or datetime.now(timezone.utc),
                is_read_only=audit_read_only,
                last_login_at=cred["last_login_at"],
                must_change_password=bool(cred["must_change_password"]),
            )

        raise HTTPException(status_code=401, detail="Invalid authentication credentials")
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token has expired")
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid token")


# ==================== NEWS & GALLERY ROUTES ====================
@api_router.get("/latest-news")
async def get_latest_news() -> Any:
    items_path = ROOT_DIR / "news_uploads" / "news_items.json"
    news_path = ROOT_DIR / "news_uploads" / "latest_news.json"
    try:
        try:
            with open(items_path, "r", encoding="utf-8") as f:
                items = json.load(f)
            if isinstance(items, dict):
                items = [items]
            if isinstance(items, list) and items:
                normalized = [_normalize_news_item(item) for item in items]
                local_items = [item for item in normalized if str(item.get("image") or "").startswith("/news_uploads/") or not item.get("image")]
                if local_items:
                    return JSONResponse(content=local_items)
        except Exception:
            pass

        derived_items = _news_items_from_upload_dir()
        if derived_items:
            return JSONResponse(content=derived_items)

        try:
            with open(news_path, "r", encoding="utf-8") as f:
                news = json.load(f)
            if isinstance(news, list):
                news = news[0] if news else {}
            news = _normalize_news_item(news)
            if news.get("newsTitle") or news.get("heading"):
                return JSONResponse(content=[news])
        except Exception:
            pass

        return JSONResponse(content=[])
    except Exception as e:
        return JSONResponse(content={"detail": f"Failed to load latest news: {e}"}, status_code=500)


@api_router.post("/latest-news")
async def update_latest_news(request: Request, current_user: User = Depends(get_current_user)) -> Any:
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admins only")
    news_path = ROOT_DIR / "news_uploads" / "latest_news.json"
    try:
        data = await request.json()
        with open(news_path, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        return {"message": "Latest news updated successfully"}
    except Exception as e:
        return JSONResponse(content={"detail": f"Failed to update latest news: {e}"}, status_code=500)


@api_router.get("/news-items")
async def get_news_items() -> Any:
    items_path = ROOT_DIR / "news_uploads" / "news_items.json"
    news_path = ROOT_DIR / "news_uploads" / "latest_news.json"
    try:
        with open(items_path, "r", encoding="utf-8") as f:
            items = json.load(f)
        if isinstance(items, dict):
            items = [items]
        if not isinstance(items, list) or not items:
            raise FileNotFoundError
        normalized_items = [_normalize_news_item(item) for item in items]
        if normalized_items:
            return JSONResponse(content=normalized_items)
        derived_items = _news_items_from_upload_dir()
        if derived_items:
            return JSONResponse(content=derived_items)
        raise FileNotFoundError
    except (FileNotFoundError, json.JSONDecodeError):
        derived_items = _news_items_from_upload_dir()
        if derived_items:
            return JSONResponse(content=derived_items)
        try:
            with open(news_path, "r", encoding="utf-8") as f:
                existing = json.load(f)
            if isinstance(existing, list):
                existing = existing[0] if existing else {}
            existing = _normalize_news_item(existing)
            if existing and (existing.get("newsTitle") or existing.get("heading")) and (str(existing.get("image") or "").startswith("/news_uploads/") or not existing.get("image")):
                if "id" not in existing:
                    existing["id"] = uuid.uuid4().hex
                if "created_at" not in existing:
                    existing["created_at"] = datetime.now(timezone.utc).isoformat()
                seeded = [existing]
                with open(items_path, "w", encoding="utf-8") as f:
                    json.dump(seeded, f, ensure_ascii=False, indent=2)
                return JSONResponse(content=seeded)
        except Exception:
            pass
        return JSONResponse(content=[])
    except Exception as e:
        return JSONResponse(content={"detail": f"Failed to load news items: {e}"}, status_code=500)


@api_router.post("/admin/news-items")
async def admin_add_news_item(request: Request, current_user: User = Depends(get_current_user)) -> Any:
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admins only")
    items_path = ROOT_DIR / "news_uploads" / "news_items.json"
    news_path = ROOT_DIR / "news_uploads" / "latest_news.json"
    try:
        data = await request.json()
        data["id"] = uuid.uuid4().hex
        data["created_at"] = datetime.now(timezone.utc).isoformat()
        # Load existing items
        try:
            with open(items_path, "r", encoding="utf-8") as f:
                items = json.load(f)
        except FileNotFoundError:
            items = []
        items.insert(0, data)
        with open(items_path, "w", encoding="utf-8") as f:
            json.dump(items, f, ensure_ascii=False, indent=2)
        # Set as active latest news
        with open(news_path, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        return JSONResponse(content=data)
    except Exception as e:
        return JSONResponse(content={"detail": f"Failed to add news item: {e}"}, status_code=500)


@api_router.put("/admin/news-items/{item_id}")
async def admin_update_news_item(item_id: str, request: Request, current_user: User = Depends(get_current_user)) -> Any:
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admins only")
    items_path = ROOT_DIR / "news_uploads" / "news_items.json"
    news_path = ROOT_DIR / "news_uploads" / "latest_news.json"
    try:
        data = await request.json()
        with open(items_path, "r", encoding="utf-8") as f:
            items = json.load(f)
        updated_items = []
        updated = None
        for item in items:
            if item.get("id") == item_id:
                merged = {**item, **data, "id": item_id}
                updated_items.append(merged)
                updated = merged
            else:
                updated_items.append(item)
        if updated is None:
            raise HTTPException(status_code=404, detail="News item not found")
        with open(items_path, "w", encoding="utf-8") as f:
            json.dump(updated_items, f, ensure_ascii=False, indent=2)
        # Update latest_news.json if this was the first/active item
        try:
            with open(news_path, "r", encoding="utf-8") as f:
                active = json.load(f)
            if isinstance(active, list):
                active = active[0] if active else {}
            if active.get("id") == item_id:
                with open(news_path, "w", encoding="utf-8") as f:
                    json.dump(updated, f, ensure_ascii=False, indent=2)
        except Exception:
            pass
        return JSONResponse(content=updated)
    except HTTPException:
        raise
    except Exception as e:
        return JSONResponse(content={"detail": f"Failed to update news item: {e}"}, status_code=500)


@api_router.delete("/admin/news-items/{item_id}")
async def admin_delete_news_item(item_id: str, current_user: User = Depends(get_current_user)) -> Any:
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admins only")
    items_path = ROOT_DIR / "news_uploads" / "news_items.json"
    news_path = ROOT_DIR / "news_uploads" / "latest_news.json"
    try:
        with open(items_path, "r", encoding="utf-8") as f:
            items = json.load(f)
        # Find item to get image URL for file deletion
        target = next((i for i in items if i.get("id") == item_id), None)
        if target and target.get("image"):
            image_url = target["image"]
            file_name = image_url.split("/")[-1].split("?")[0]
            news_file = ROOT_DIR / "news_uploads" / file_name
            if news_file.exists():
                news_file.unlink()
        items = [i for i in items if i.get("id") != item_id]
        with open(items_path, "w", encoding="utf-8") as f:
            json.dump(items, f, ensure_ascii=False, indent=2)
        # Update active news to next item if any
        if items:
            with open(news_path, "w", encoding="utf-8") as f:
                json.dump(items[0], f, ensure_ascii=False, indent=2)
        return {"message": "News item removed"}
    except Exception as e:
        return JSONResponse(content={"detail": f"Failed to delete news item: {e}"}, status_code=500)


@api_router.get("/gallery-items")
async def get_gallery_items() -> Any:
    items_path = ROOT_DIR / "gallery_uploads" / "gallery_items.json"
    try:
        with open(items_path, "r", encoding="utf-8") as f:
            items = json.load(f)
        if isinstance(items, dict):
            items = [items]
        normalized_items = [_normalize_gallery_item(item) for item in items if isinstance(item, dict)]
        has_uploaded_media = any(any(image.get("url") for image in (item.get("images") or []) if isinstance(image, dict)) or item.get("url") for item in normalized_items)
        return JSONResponse(content=normalized_items if has_uploaded_media else _gallery_items_from_upload_dir())
    except Exception:
        return JSONResponse(content=_gallery_items_from_upload_dir())


# ==================== AUTH ROUTES ====================
@api_router.get("/anti-automation/challenge", response_model=CaptchaChallenge)
async def get_anti_automation_challenge(request: Request) -> CaptchaChallenge:
    _cleanup_captcha_challenges()
    left = secrets.randbelow(8) + 2
    right = secrets.randbelow(8) + 2
    captcha_id = uuid.uuid4().hex
    _captcha_challenges[captcha_id] = {
        "answer": str(left + right),
        "expires_at": time.time() + 5 * 60,
    }
    return CaptchaChallenge(captcha_id=captcha_id, question=f"{left} + {right}")


async def _start_login_otp(
    session: AsyncSession,
    request: Request,
    account_table: str,
    account: Mapping[str, Any],
) -> Dict[str, Any]:
    enforce_password_reset_rate_limit(request, f"login:{account_table}:{account['id']}")
    reset_id = str(uuid.uuid4())
    otp = f"{secrets.randbelow(1_000_000):06d}"
    now = datetime.now(timezone.utc)
    expires_at = now + timedelta(minutes=PASSWORD_RESET_OTP_EXPIRY_MINUTES)
    await session.execute(
        text(
            """
            UPDATE password_reset_tokens
            SET used_at = :used_at
            WHERE account_table = :account_table
              AND account_id = :account_id
              AND purpose = 'login'
              AND used_at IS NULL
            """
        ),
        {"used_at": now, "account_table": account_table, "account_id": str(account["id"])},
    )
    await session.execute(
        text(
            """
            INSERT INTO password_reset_tokens
                (id, account_table, account_id, email, purpose, otp_hash, ip_address, attempts, used_at, expires_at, created_at)
            VALUES
                (:id, :account_table, :account_id, :email, 'login', :otp_hash, :ip_address, 0, NULL, :expires_at, :created_at)
            """
        ),
        {
            "id": reset_id,
            "account_table": account_table,
            "account_id": str(account["id"]),
            "email": str(account["email"]),
            "otp_hash": _hash_reset_otp(reset_id, otp),
            "ip_address": _client_ip(request),
            "expires_at": expires_at,
            "created_at": now,
        },
    )
    await session.commit()
    _send_password_reset_otp(str(account["email"]), str(account["name"] or "User"), otp)
    return {
        "login_pending": True,
        "reset_id": reset_id,
        "masked_email": _mask_email(str(account["email"])),
        "message": "OTP sent to registered email.",
    }


async def _build_login_success(
    session: AsyncSession,
    identifier: str,
    client_ip: str,
    account_table: str,
    account: Mapping[str, Any],
) -> Dict[str, Any]:
    if int(account["is_active"] if account["is_active"] is not None else 1) != 1:
        await record_login_attempt(session, identifier, client_ip, False)
        raise HTTPException(status_code=403, detail="Account is disabled")
    audit_read_only = is_audit_account(account)
    if account_table == "admin":
        session_id, previous_login_at = await _activate_login_session(session, "admin", account["id"])
        access_token = create_access_token({"admin_id": account["id"], "is_admin": True, "role": "admin", "audit_read_only": audit_read_only, "sid": session_id})
        portal_role = "admin"
        officer_role = None
    elif account_table == "dgp":
        session_id, previous_login_at = await _activate_login_session(session, "dgp", account["id"])
        access_token = create_access_token({"officer_id": account["id"], "officer_role": "dgp", "audit_read_only": audit_read_only, "sid": session_id})
        portal_role = "officer"
        officer_role = "dgp"
    elif account_table == "stations":
        session_id, previous_login_at = await _activate_login_session(session, "stations", account["id"])
        access_token = create_access_token({"station_id": account["id"], "role": "station", "audit_read_only": audit_read_only, "sid": session_id})
        portal_role = "officer"
        officer_role = "station"
    else:
        cred_role = account_table
        session_id, previous_login_at = await _activate_login_session(session, account_table, account["id"])
        access_token = create_access_token({"cred_id": account["id"], "cred_role": cred_role, "audit_read_only": audit_read_only, "sid": session_id})
        portal_role = "officer"
        officer_role = cred_role
    await record_login_attempt(session, identifier, client_ip, True)
    response: Dict[str, Any] = {
        "msg": "Login successful",
        "portal_role": portal_role,
        "access_token": access_token,
        "token_type": "bearer",
        "user": build_auth_user_payload(account["id"], account["email"], account["name"], account["phone"] or "N/A", account["created_at"], audit_read_only, previous_login_at, bool(account["must_change_password"])),
    }
    if portal_role == "admin":
        response.update({"admin_id": account["id"], "email": account["email"], "name": account["name"]})
    else:
        response["officer_role"] = officer_role
    return response


@api_router.post("/admin/login")
async def admin_login(credentials: AdminLogin, request: Request, session: AsyncSession = Depends(get_async_session)) -> Any:
    identifier = str(credentials.identifier or "").strip()
    client_ip = _client_ip(request)
    await enforce_login_rate_limit(session, identifier, client_ip)
    await ensure_auth_security_columns(session)
    await ensure_admin_password_patterns(session)
    result = await session.execute(
        text("SELECT id, email, name, phone, password, created_at, must_change_password, is_active FROM admin WHERE email = :id OR id = :id OR name = :id LIMIT 1"),
        {"id": identifier},
    )
    admin = result.mappings().first()
    if admin and verify_password(credentials.password, str(admin["password"] or "")):
        if int(admin["is_active"] if admin["is_active"] is not None else 1) != 1:
            await record_login_attempt(session, identifier, client_ip, False)
            raise HTTPException(status_code=403, detail="Account is disabled")
        return await _start_login_otp(session, request, "admin", admin)

    await ensure_officer_credentials_table(session)
    officer_result = await session.execute(
        text("SELECT id, email, name, phone, password, role, created_at, must_change_password, is_active FROM dgp WHERE email = :id OR id = :id OR name = :id LIMIT 1"),
        {"id": identifier},
    )
    officer = officer_result.mappings().first()
    if officer:
        if not verify_password(credentials.password, str(officer["password"] or "")):
            await record_login_attempt(session, identifier, client_ip, False)
            raise HTTPException(status_code=401, detail="Invalid credentials")
        if int(officer["is_active"] if officer["is_active"] is not None else 1) != 1:
            await record_login_attempt(session, identifier, client_ip, False)
            raise HTTPException(status_code=403, detail="Account is disabled")
        return await _start_login_otp(session, request, "dgp", officer)

    for cred_role in ("station", "srp", "dsrp", "irp"):
        cred_table = "stations" if cred_role == "station" else cred_role
        cred_result = await session.execute(
            text(f"SELECT id, email, name, phone, password, created_at, must_change_password, is_active FROM {cred_table} WHERE email = :id OR id = :id OR name = :id LIMIT 1"),
            {"id": identifier},
        )
        cred = cred_result.mappings().first()
        if cred:
            if not verify_password(credentials.password, str(cred["password"] or "")):
                await record_login_attempt(session, identifier, client_ip, False)
                raise HTTPException(status_code=401, detail=f"Invalid credentials")
            if int(cred["is_active"] if cred["is_active"] is not None else 1) != 1:
                await record_login_attempt(session, identifier, client_ip, False)
                raise HTTPException(status_code=403, detail="Account is disabled")
            return await _start_login_otp(session, request, cred_table, cred)

    await record_login_attempt(session, identifier, client_ip, False)
    raise HTTPException(status_code=401, detail="Invalid credentials")


@api_router.post("/admin/login/verify")
async def verify_admin_login(body: AdminLoginVerify, request: Request, session: AsyncSession = Depends(get_async_session)) -> Any:
    verify_captcha(body.captcha_id, body.captcha_answer)
    otp = re.sub(r"\D+", "", str(body.otp or ""))
    if not re.fullmatch(r"\d{6}", otp):
        raise HTTPException(status_code=400, detail="Enter the 6-digit OTP.")
    await ensure_auth_security_columns(session)
    now = datetime.now(timezone.utc)
    token_result = await session.execute(
        text(
            """
            SELECT id, account_table, account_id, email, otp_hash, attempts
            FROM password_reset_tokens
            WHERE id = :id AND purpose = 'login' AND used_at IS NULL AND expires_at > :now
            LIMIT 1
            """
        ),
        {"id": str(body.reset_id), "now": now},
    )
    token = token_result.mappings().first()
    if not token:
        raise HTTPException(status_code=400, detail="Login OTP is invalid or expired.")
    if str(token["account_table"]) not in {"admin", "dgp", "srp", "dsrp", "irp", "stations"}:
        raise HTTPException(status_code=400, detail="Login OTP is invalid or expired.")
    if int(token["attempts"] or 0) >= PASSWORD_RESET_MAX_OTP_ATTEMPTS:
        raise HTTPException(status_code=429, detail="Too many incorrect OTP attempts. Please request a new OTP.")
    if not secrets.compare_digest(str(token["otp_hash"]), _hash_reset_otp(str(token["id"]), otp)):
        await session.execute(text("UPDATE password_reset_tokens SET attempts = attempts + 1 WHERE id = :id"), {"id": token["id"]})
        await session.commit()
        raise HTTPException(status_code=400, detail="OTP is incorrect.")
    table = str(token["account_table"])
    result = await session.execute(
        text(f"SELECT id, email, name, phone, created_at, must_change_password, is_active FROM {table} WHERE id = :id LIMIT 1"),
        {"id": token["account_id"]},
    )
    account = result.mappings().first()
    if not account:
        raise HTTPException(status_code=401, detail="Invalid authentication credentials")
    await session.execute(text("UPDATE password_reset_tokens SET used_at = :used_at WHERE id = :id"), {"used_at": now, "id": token["id"]})
    response = await _build_login_success(session, str(token["email"]), _client_ip(request), table, account)
    await session.commit()
    return response


@api_router.post("/auth/logout")
async def logout_current_session(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    session: AsyncSession = Depends(get_async_session),
) -> Any:
    try:
        payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM])  # type: ignore[arg-type]
    except Exception:
        return {"message": "Logged out"}
    table, user_id = _token_table_from_payload(payload)
    if table and user_id:
        await ensure_auth_security_columns(session)
        await session.execute(text(f"UPDATE {table} SET active_session_id = NULL WHERE id = :id"), {"id": user_id})
        await session.commit()
    return {"message": "Logged out"}


@api_router.post("/auth/change-password/otp")
async def request_change_password_otp(
    request: Request,
    credentials: HTTPAuthorizationCredentials = Depends(security),
    session: AsyncSession = Depends(get_async_session),
) -> Dict[str, str]:
    payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM])  # type: ignore[arg-type]
    table, user_id = _token_table_from_payload(payload)
    if not table or not user_id:
        raise HTTPException(status_code=401, detail="Invalid authentication credentials")
    await ensure_auth_security_columns(session)
    result = await session.execute(
        text(f"SELECT email, name FROM {table} WHERE id = :id LIMIT 1"),
        {"id": user_id},
    )
    account = result.mappings().first()
    if not account or not account["email"]:
        raise HTTPException(status_code=400, detail="No registered email found for this account.")
    reset_id = str(uuid.uuid4())
    otp = f"{secrets.randbelow(1_000_000):06d}"
    now = datetime.now(timezone.utc)
    expires_at = now + timedelta(minutes=PASSWORD_RESET_OTP_EXPIRY_MINUTES)
    await session.execute(
        text(
            """
            INSERT INTO password_reset_tokens
                (id, account_table, account_id, email, purpose, otp_hash, ip_address, attempts, used_at, expires_at, created_at)
            VALUES
                (:id, :account_table, :account_id, :email, 'password_change', :otp_hash, :ip_address, 0, NULL, :expires_at, :created_at)
            """
        ),
        {
            "id": reset_id,
            "account_table": table,
            "account_id": str(user_id),
            "email": str(account["email"]),
            "otp_hash": _hash_reset_otp(reset_id, otp),
            "ip_address": _client_ip(request),
            "expires_at": expires_at,
            "created_at": now,
        },
    )
    await session.commit()
    _send_password_reset_otp(str(account["email"]), str(account["name"] or "User"), otp)
    return {
        "reset_id": reset_id,
        "message": "OTP sent to registered email.",
        "masked_email": _mask_email(str(account["email"])),
    }


@api_router.post("/auth/change-password")
async def change_current_password(
    body: PasswordChangeRequest,
    request: Request,
    credentials: HTTPAuthorizationCredentials = Depends(security),
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session),
) -> Any:
    payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM])  # type: ignore[arg-type]
    table, user_id = _token_table_from_payload(payload)
    if not table or not user_id:
        raise HTTPException(status_code=401, detail="Invalid authentication credentials")
    verify_captcha(body.captcha_id, body.captcha_answer)
    result = await session.execute(text(f"SELECT password, email, name FROM {table} WHERE id = :id LIMIT 1"), {"id": user_id})
    row = result.mappings().first()
    if not row or not verify_password(body.current_password, str(row["password"] or "")):
        raise HTTPException(status_code=401, detail="Invalid current password")
    validate_strong_password(body.new_password)
    await _ensure_password_not_recently_used(session, table, user_id, body.new_password, str(row["password"] or ""))
    otp = re.sub(r"\D+", "", str(body.otp or ""))
    if not re.fullmatch(r"\d{6}", otp):
        raise HTTPException(status_code=400, detail="Enter the 6-digit OTP.")
    now = datetime.now(timezone.utc)
    token_result = await session.execute(
        text(
            """
            SELECT id, otp_hash, attempts
            FROM password_reset_tokens
            WHERE account_table = :account_table
              AND account_id = :account_id
              AND purpose = 'password_change'
              AND used_at IS NULL
              AND expires_at > :now
            ORDER BY created_at DESC
            LIMIT 1
            """
        ),
        {"account_table": table, "account_id": str(user_id), "now": now},
    )
    token = token_result.mappings().first()
    if not token:
        raise HTTPException(status_code=400, detail="Password update OTP is invalid or expired.")
    if int(token["attempts"] or 0) >= PASSWORD_RESET_MAX_OTP_ATTEMPTS:
        raise HTTPException(status_code=429, detail="Too many incorrect OTP attempts. Please request a new OTP.")
    if not secrets.compare_digest(str(token["otp_hash"]), _hash_reset_otp(str(token["id"]), otp)):
        await session.execute(
            text("UPDATE password_reset_tokens SET attempts = attempts + 1 WHERE id = :id"),
            {"id": token["id"]},
        )
        await session.commit()
        raise HTTPException(status_code=400, detail="OTP is incorrect.")
    hashed_password = hash_password(body.new_password)
    await session.execute(
        text(f"UPDATE {table} SET password = :password, must_change_password = 0, active_session_id = NULL WHERE id = :id"),
        {"password": hashed_password, "id": user_id},
    )
    await _remember_password_hash(session, table, user_id, hashed_password)
    await session.execute(
        text(
            """
            UPDATE password_reset_tokens
            SET used_at = :used_at
            WHERE account_table = :account_table AND account_id = :account_id AND purpose = 'password_change' AND used_at IS NULL
            """
        ),
        {"used_at": now, "account_table": table, "account_id": str(user_id)},
    )
    await write_audit_log(
        session,
        current_user,
        request,
        action="self_password_change",
        target_type=str(current_user.role),
        target_id=str(user_id),
    )
    await session.commit()
    _send_security_notification(
        str(row["email"] or ""),
        str(row["name"] or "User"),
        "[GRP AP] Password Changed",
        "Your GRP portal password was changed successfully. If you did not perform this action, contact your administrator immediately.",
    )
    return {"message": "Password changed successfully"}


@api_router.get("/auth/me", response_model=User)
async def get_current_profile(current_user: User = Depends(get_current_user)) -> User:
    return current_user


@api_router.patch("/auth/profile/name", response_model=User)
async def update_current_profile_name(
    body: ProfileNameUpdate,
    request: Request,
    credentials: HTTPAuthorizationCredentials = Depends(security),
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session),
) -> User:
    payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM])  # type: ignore[arg-type]
    table, user_id = _token_table_from_payload(payload)
    if not table or not user_id:
        raise HTTPException(status_code=401, detail="Invalid authentication credentials")
    new_name = re.sub(r"\s+", " ", str(body.name or "").strip())
    if len(new_name) < 2:
        raise HTTPException(status_code=400, detail="Name must be at least 2 characters.")
    if len(new_name) > 120:
        raise HTTPException(status_code=400, detail="Name must be 120 characters or less.")
    result = await session.execute(
        text(f"UPDATE {table} SET name = :name WHERE id = :id"),
        {"name": new_name, "id": user_id},
    )
    if result.rowcount == 0:
        raise HTTPException(status_code=404, detail="Profile not found")
    await write_audit_log(
        session,
        current_user,
        request,
        action="self_profile_name_update",
        target_type=str(current_user.role),
        target_id=str(user_id),
        details={"old_name": current_user.name, "new_name": new_name},
    )
    await session.commit()
    return User(
        **{
            **current_user.model_dump(),
            "name": new_name,
        }
    )


@api_router.post("/auth/change-username/otp")
async def request_change_username_otp(
    request: Request,
    credentials: HTTPAuthorizationCredentials = Depends(security),
    session: AsyncSession = Depends(get_async_session),
) -> Dict[str, str]:
    payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM])  # type: ignore[arg-type]
    table, user_id = _token_table_from_payload(payload)
    if not table or not user_id:
        raise HTTPException(status_code=401, detail="Invalid authentication credentials")
    await ensure_auth_security_columns(session)
    enforce_password_reset_rate_limit(request, str(user_id))
    result = await session.execute(
        text(f"SELECT email, name FROM {table} WHERE id = :id LIMIT 1"),
        {"id": user_id},
    )
    account = result.mappings().first()
    if not account or not account["email"]:
        raise HTTPException(status_code=400, detail="No registered email found for this account.")
    reset_id = str(uuid.uuid4())
    otp = f"{secrets.randbelow(1_000_000):06d}"
    now = datetime.now(timezone.utc)
    expires_at = now + timedelta(minutes=PASSWORD_RESET_OTP_EXPIRY_MINUTES)
    await session.execute(
        text(
            """
            INSERT INTO password_reset_tokens
                (id, account_table, account_id, email, purpose, otp_hash, ip_address, attempts, used_at, expires_at, created_at)
            VALUES
                (:id, :account_table, :account_id, :email, 'username_change', :otp_hash, :ip_address, 0, NULL, :expires_at, :created_at)
            """
        ),
        {
            "id": reset_id,
            "account_table": table,
            "account_id": str(user_id),
            "email": str(account["email"]),
            "otp_hash": _hash_reset_otp(reset_id, otp),
            "ip_address": _client_ip(request),
            "expires_at": expires_at,
            "created_at": now,
        },
    )
    await session.commit()
    _send_password_reset_otp(str(account["email"]), str(account["name"] or "User"), otp)
    return {
        "reset_id": reset_id,
        "message": "OTP sent to registered email.",
        "masked_email": _mask_email(str(account["email"])),
    }


@api_router.post("/auth/change-username")
async def change_current_username(
    body: UsernameChangeRequest,
    request: Request,
    credentials: HTTPAuthorizationCredentials = Depends(security),
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session),
) -> Any:
    payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM])  # type: ignore[arg-type]
    table, user_id = _token_table_from_payload(payload)
    if not table or not user_id:
        raise HTTPException(status_code=401, detail="Invalid authentication credentials")
    verify_captcha(body.captcha_id, body.captcha_answer)
    new_username = str(body.new_username).strip().lower()
    result = await session.execute(text(f"SELECT email, name FROM {table} WHERE id = :id LIMIT 1"), {"id": user_id})
    account = result.mappings().first()
    if not account:
        raise HTTPException(status_code=401, detail="Invalid authentication credentials")
    old_username = str(account["email"] or "").strip().lower()
    if new_username == old_username:
        raise HTTPException(status_code=400, detail="New username must be different from current username")
    for candidate_table in ("admin", "dgp", "srp", "dsrp", "irp", "stations", "public_users"):
        duplicate = await session.execute(
            text(f"SELECT id FROM {candidate_table} WHERE lower(email) = :email LIMIT 1"),
            {"email": new_username},
        )
        row = duplicate.mappings().first()
        if row and not (candidate_table == table and str(row["id"]) == str(user_id)):
            raise HTTPException(status_code=409, detail="Username already exists")
    otp = re.sub(r"\D+", "", str(body.otp or ""))
    if not re.fullmatch(r"\d{6}", otp):
        raise HTTPException(status_code=400, detail="Enter the 6-digit OTP.")
    now = datetime.now(timezone.utc)
    token_result = await session.execute(
        text(
            """
            SELECT id, otp_hash, attempts
            FROM password_reset_tokens
            WHERE account_table = :account_table
              AND account_id = :account_id
              AND purpose = 'username_change'
              AND used_at IS NULL
              AND expires_at > :now
            ORDER BY created_at DESC
            LIMIT 1
            """
        ),
        {"account_table": table, "account_id": str(user_id), "now": now},
    )
    token = token_result.mappings().first()
    if not token:
        raise HTTPException(status_code=400, detail="Username update OTP is invalid or expired.")
    if int(token["attempts"] or 0) >= PASSWORD_RESET_MAX_OTP_ATTEMPTS:
        raise HTTPException(status_code=429, detail="Too many incorrect OTP attempts. Please request a new OTP.")
    if not secrets.compare_digest(str(token["otp_hash"]), _hash_reset_otp(str(token["id"]), otp)):
        await session.execute(
            text("UPDATE password_reset_tokens SET attempts = attempts + 1 WHERE id = :id"),
            {"id": token["id"]},
        )
        await session.commit()
        raise HTTPException(status_code=400, detail="OTP is incorrect.")
    await session.execute(
        text(f"UPDATE {table} SET email = :email, active_session_id = NULL WHERE id = :id"),
        {"email": new_username, "id": user_id},
    )
    await session.execute(
        text(
            """
            UPDATE password_reset_tokens
            SET used_at = :used_at
            WHERE account_table = :account_table AND account_id = :account_id AND purpose = 'username_change' AND used_at IS NULL
            """
        ),
        {"used_at": now, "account_table": table, "account_id": str(user_id)},
    )
    await write_audit_log(
        session,
        current_user,
        request,
        action="self_username_change",
        target_type=str(current_user.role),
        target_id=str(user_id),
        details={"old_username": old_username, "new_username": new_username},
    )
    await session.commit()
    display_name = str(account["name"] or "User")
    _send_security_notification(
        old_username,
        display_name,
        "[GRP AP] Username Changed",
        (
            f"Dear {display_name},\n\n"
            f"Your GRP portal username was changed from {old_username} to {new_username}.\n"
            f"If you did not make this change, please contact your administrator immediately.\n\n"
            f"Regards,\nGRP Police Administration"
        ),
    )
    _send_security_notification(
        new_username,
        display_name,
        "[GRP AP] Username Change Confirmed",
        (
            f"Dear {display_name},\n\n"
            f"Your GRP portal username is now {new_username}.\n\n"
            f"Regards,\nGRP Police Administration"
        ),
    )
    return {"message": "Username updated successfully. Please log in again.", "username": new_username}


@api_router.post("/auth/password-reset/request")
async def request_password_reset(
    body: PasswordResetStartRequest,
    request: Request,
    session: AsyncSession = Depends(get_async_session),
) -> Dict[str, str]:
    identifier = str(body.identifier or "").strip()
    if not identifier:
        raise HTTPException(status_code=400, detail="Username or email is required.")
    verify_captcha(body.captcha_id, body.captcha_answer)
    await ensure_auth_security_columns(session)
    enforce_password_reset_rate_limit(request, identifier)
    account = await _find_reset_account(session, identifier)
    reset_id = str(uuid.uuid4())
    otp = f"{secrets.randbelow(1_000_000):06d}"
    now = datetime.now(timezone.utc)
    expires_at = now + timedelta(minutes=PASSWORD_RESET_OTP_EXPIRY_MINUTES)
    await session.execute(
        text(
            """
            INSERT INTO password_reset_tokens
                (id, account_table, account_id, email, purpose, otp_hash, ip_address, attempts, used_at, expires_at, created_at)
            VALUES
                (:id, :account_table, :account_id, :email, 'password_reset', :otp_hash, :ip_address, 0, NULL, :expires_at, :created_at)
            """
        ),
        {
            "id": reset_id,
            "account_table": account["table"] if account else None,
            "account_id": account["id"] if account else None,
            "email": account["email"] if account else None,
            "otp_hash": _hash_reset_otp(reset_id, otp),
            "ip_address": _client_ip(request),
            "expires_at": expires_at,
            "created_at": now,
        },
    )
    await session.commit()
    if account:
        _send_password_reset_otp(account["email"], account["name"], otp)
    return {
        "reset_id": reset_id,
        "message": "If the account exists, an OTP has been sent to the registered email.",
        "masked_email": "",
    }


@api_router.post("/auth/password-reset/complete")
async def complete_password_reset(
    body: PasswordResetCompleteRequest,
    request: Request,
    session: AsyncSession = Depends(get_async_session),
) -> Dict[str, str]:
    reset_id = str(body.reset_id or "").strip()
    otp = re.sub(r"\D+", "", str(body.otp or ""))
    if not reset_id or not re.fullmatch(r"\d{6}", otp):
        raise HTTPException(status_code=400, detail="Enter the 6-digit OTP.")
    validate_strong_password(body.new_password)
    result = await session.execute(
        text(
            """
            SELECT id, account_table, account_id, otp_hash, attempts, used_at, expires_at, purpose
            FROM password_reset_tokens
            WHERE id = :id AND purpose = 'password_reset'
            LIMIT 1
            """
        ),
        {"id": reset_id},
    )
    token = result.mappings().first()
    now = datetime.now(timezone.utc)
    if not token or token["used_at"] or token["expires_at"] < now or not token["account_table"] or not token["account_id"]:
        raise HTTPException(status_code=400, detail="Reset OTP is invalid or expired.")
    if int(token["attempts"] or 0) >= PASSWORD_RESET_MAX_OTP_ATTEMPTS:
        raise HTTPException(status_code=429, detail="Too many incorrect OTP attempts. Please request a new OTP.")
    if not secrets.compare_digest(str(token["otp_hash"]), _hash_reset_otp(reset_id, otp)):
        await session.execute(
            text("UPDATE password_reset_tokens SET attempts = attempts + 1 WHERE id = :id"),
            {"id": reset_id},
        )
        await session.commit()
        raise HTTPException(status_code=400, detail="OTP is incorrect.")
    table_name = str(token["account_table"])
    if table_name not in {"admin", "dgp", "srp", "dsrp", "irp", "stations"}:
        raise HTTPException(status_code=400, detail="Reset OTP is invalid or expired.")
    account_result = await session.execute(
        text(f"SELECT password, email, name FROM {table_name} WHERE id = :id LIMIT 1"),
        {"id": token["account_id"]},
    )
    account = account_result.mappings().first()
    if not account:
        raise HTTPException(status_code=400, detail="Reset OTP is invalid or expired.")
    await _ensure_password_not_recently_used(session, table_name, token["account_id"], body.new_password, str(account["password"] or ""))
    hashed_password = hash_password(body.new_password)
    await ensure_auth_security_columns(session)
    await session.execute(
        text(f"UPDATE {table_name} SET password = :password, must_change_password = 0, active_session_id = NULL WHERE id = :id"),
        {"password": hashed_password, "id": token["account_id"]},
    )
    await _remember_password_hash(session, table_name, token["account_id"], hashed_password)
    await session.execute(
        text(
            """
            UPDATE password_reset_tokens
            SET used_at = :used_at
            WHERE account_table = :account_table AND account_id = :account_id AND purpose = 'password_reset' AND used_at IS NULL
            """
        ),
        {"used_at": now, "account_table": table_name, "account_id": token["account_id"]},
    )
    await session.execute(
        text(
            """
            INSERT INTO audit_logs (id, actor_id, actor_role, action, target_type, target_id, ip_address, details, created_at)
            VALUES (:id, :actor_id, :actor_role, :action, :target_type, :target_id, :ip_address, :details, :created_at)
            """
        ),
        {
            "id": str(uuid.uuid4()),
            "actor_id": str(token["account_id"]),
            "actor_role": table_name,
            "action": "self_password_reset",
            "target_type": table_name,
            "target_id": str(token["account_id"]),
            "ip_address": _client_ip(request),
            "details": json.dumps({"method": "email_otp"}),
            "created_at": now,
        },
    )
    await session.commit()
    _send_security_notification(
        str(account["email"] or ""),
        str(account["name"] or "User"),
        "[GRP AP] Password Reset Completed",
        "Your GRP portal password was reset successfully. If you did not perform this action, contact your administrator immediately.",
    )
    return {"message": "Password reset successfully. Please login with your new password."}


@api_router.get("/admin/login-options", response_model=List[AdminLoginOption])
async def get_admin_login_options(
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session),
) -> List[AdminLoginOption]:
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Only admins can view login options")
    try:
        await ensure_officer_credentials_table(session)
        await ensure_auth_security_columns(session)
        await ensure_admin_password_patterns(session)

        admin_result = await session.execute(text("SELECT id, name FROM admin WHERE is_active = 1 ORDER BY name, id"))
        admins = admin_result.mappings().all()

        officer_result = await session.execute(text("SELECT id, name, role FROM dgp WHERE is_active = 1 ORDER BY name"))
        officers = officer_result.mappings().all()

        options: List[AdminLoginOption] = []
        options.extend([
            AdminLoginOption(identifier=str(row["id"]), label="Admin", scope="admin", account_role="admin", group="Admin")
            for row in admins
        ])

        for superior_row in officers:
            options.append(AdminLoginOption(
                identifier=str(superior_row["id"]),
                label=_format_superior_officer_label(str(superior_row["role"]), str(superior_row["name"])),
                scope="officer", account_role="dgp", group="Superior Officers",
            ))

        grouped_result = await session.execute(text("SELECT id, name FROM srp WHERE is_active = 1 ORDER BY name"))
        for row in grouped_result.mappings().all():
            options.append(AdminLoginOption(identifier=str(row["id"]), label=str(row["name"]), scope="srp", account_role="srp", group="SRP"))

        dsrp_result = await session.execute(text("SELECT id, name FROM dsrp WHERE is_active = 1 ORDER BY name"))
        for row in dsrp_result.mappings().all():
            options.append(AdminLoginOption(identifier=str(row["id"]), label=str(row["name"]), scope="dsrp", account_role="dsrp", group="DSRP"))

        irp_result = await session.execute(text("SELECT id, name FROM irp WHERE is_active = 1 ORDER BY name"))
        for row in irp_result.mappings().all():
            options.append(AdminLoginOption(identifier=str(row["id"]), label=str(row["name"]), scope="irp", account_role="irp", group="IRP"))

        station_result = await session.execute(text("SELECT id, name FROM stations WHERE is_active = 1 ORDER BY name"))
        for s in station_result.mappings().all():
            options.append(AdminLoginOption(identifier=str(s["id"]), label=str(s["name"]), scope="station", account_role="station", group="Stations"))

        return options
    except Exception as exc:
        logger.exception("Failed to load admin login options: %s", exc)
        raise HTTPException(status_code=500, detail="Internal server error")


# ==================== SRP CREDENTIALS ====================
@api_router.post("/admin/srp-credentials", response_model=AdminCredentialEntry)
async def create_srp_credential(
    data: SRPCredentialCreate,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session),
) -> AdminCredentialEntry:
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admins only")
    if data.name not in SRP_ALLOWED_NAMES:
        raise HTTPException(status_code=400, detail="Invalid SRP name")
    hashed_password = hash_password(data.password)
    existing_result = await session.execute(
        text("SELECT id, email, name, phone, password FROM srp WHERE name = :name LIMIT 1"),
        {"name": data.name},
    )
    existing = existing_result.mappings().first()
    if existing:
        await session.execute(
            text("UPDATE srp SET email = :email, phone = :phone, password = :password WHERE id = :id"),
            {"email": data.email, "phone": data.phone or existing["phone"], "password": hashed_password, "id": existing["id"]},
        )
        await session.commit()
        return AdminCredentialEntry(
            scope="srp", id=str(existing["id"]), name=str(existing["name"]),
            email=data.email, password="••••••••", role="srp",
        )
    new_id = str(uuid.uuid4())
    await session.execute(
        text("INSERT INTO srp (id, email, name, phone, password, role, created_at) VALUES (:id, :email, :name, :phone, :password, 'srp', :created_at)"),
        {"id": new_id, "email": data.email, "name": data.name, "phone": data.phone or "", "password": hashed_password, "created_at": datetime.utcnow()},
    )
    await session.commit()
    return AdminCredentialEntry(
        scope="srp", id=new_id, name=data.name,
        email=data.email, password="••••••••", role="srp",
    )


# ==================== COMPLAINT ROUTES ====================
def _complaint_to_schema(c: ComplaintORM) -> Complaint:
    return Complaint(
        id=str(c.id), user_id=str(c.user_id),
        complainant_name=c.complainant_name,
        complainant_phone=c.complainant_phone,
        address=c.address,
        state=c.state,
        complainant_email=c.complainant_email,
        supporting_docs=[_normalize_media_url(item) for item in _decode_media_field(c.supporting_docs)],
        complaint_type=str(c.complaint_type), description=str(c.description),
        location=str(c.location), station=str(c.station),
        incident_date=str(c.incident_date),
        evidence_urls=str(c.evidence_urls).split(",") if c.evidence_urls else [],
        status=str(c.status), rejection_reason=c.rejection_reason,
        tracking_number=str(c.tracking_number),
        created_at=c.created_at, updated_at=c.updated_at,
    )



@api_router.post("/complaints", response_model=Complaint)
async def create_complaint(
    request: Request,
    complainant_name: str = Form(...),
    complainant_phone: str = Form(...),
    complainant_email: str = Form(...),
    address: str = Form(...),
    state: Optional[str] = Form(None),
    complaint_type: str = Form(...),
    description: str = Form(...),
    location: Optional[str] = Form(None),
    incident_date: str = Form(...),
    captcha_id: str = Form(...),
    captcha_answer: str = Form(...),
    supporting_docs: List[UploadFile] = File(default=[]),
    session: AsyncSession = Depends(get_async_session),
) -> Complaint:
    enforce_public_submission_rate_limit(request, "complaints")
    verify_captcha(captcha_id, captcha_answer)
    station = "Unassigned"
    incident_date = _validate_incident_date(incident_date)
    normalized_phone = re.sub(r"\D+", "", str(complainant_phone or ""))
    if not re.fullmatch(r"\d{10}", normalized_phone):
        raise HTTPException(status_code=400, detail="Phone number must be exactly 10 digits")
    normalized_email = str(complainant_email or "").strip()
    if not re.fullmatch(r"[^\s@]+@[^\s@]+\.[^\s@]+", normalized_email):
        raise HTTPException(status_code=400, detail="Please enter a valid email address")
    await ensure_complaints_table_columns(session)
    complaint_uploads_dir = ROOT_DIR / "complaint_uploads"
    complaint_uploads_dir.mkdir(parents=True, exist_ok=True)
    supporting_doc_paths: List[str] = []
    for supporting_doc in list(supporting_docs or []):
        if not supporting_doc or not supporting_doc.filename:
            continue
        content, ext = await _read_validated_upload(supporting_doc, DOC_MIME_EXTENSIONS, "document")
        supporting_docs_name = f"{uuid.uuid4().hex}{ext}"
        dest = complaint_uploads_dir / supporting_docs_name
        dest.write_bytes(content)
        supporting_doc_paths.append(f"/complaint_uploads/{supporting_docs_name}")
    complaint_orm = ComplaintORM(
        id=str(uuid.uuid4()), user_id="anonymous",
        complainant_name=complainant_name,
        complainant_phone=normalized_phone,
        complainant_email=normalized_email,
        address=address,
        state=state,
        complaint_type=complaint_type, description=description,
        location=(location or "Not Provided"), station=station,
        incident_date=incident_date, evidence_urls="",
        supporting_docs=_encode_media_field(supporting_doc_paths),
        status="pending", rejection_reason=None,
        tracking_number=f"GRPAP{uuid.uuid4().hex[:8].upper()}",
        created_at=datetime.now(timezone.utc), updated_at=datetime.now(timezone.utc),
    )
    session.add(complaint_orm)
    await session.commit()
    await session.refresh(complaint_orm)

    # Auto-create alert in alerts table
    alert_orm = AlertORM(
        id=str(uuid.uuid4()),
        alert_type="complaint",
        title=f"New Complaint Filed – {complaint_orm.tracking_number}",
        description=(
            f"Type: {complaint_type} | Station: {station} | "
            f"Incident: {incident_date} | Tracking: {complaint_orm.tracking_number}"
        ),
        priority="high",
        is_active="true",
        created_at=datetime.now(timezone.utc),
    )
    session.add(alert_orm)
    await session.commit()

    # Send email alert to admin (non-blocking)
    _send_complaint_email_alert(
        tracking_number=str(complaint_orm.tracking_number),
        complaint_type=complaint_type,
        station=station,
        incident_date=incident_date,
        complainant_name=complainant_name,
        complainant_phone=normalized_phone,
        address=address,
        complainant_email=normalized_email,
        location=location,
        description=description,
    )

    return _complaint_to_schema(complaint_orm)


@api_router.get("/complaints", response_model=List[Complaint])
async def get_complaints(
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session),
) -> List[Complaint]:
    await ensure_complaints_table_columns(session)
    stmt = select(ComplaintORM) if current_user.role != "public" else select(ComplaintORM).where(ComplaintORM.user_id == current_user.id)
    result = await session.execute(stmt)
    return [_complaint_to_schema(c) for c in result.scalars().all()]



@api_router.get("/complaints/{complaint_id}", response_model=Complaint)
async def get_complaint(
    complaint_id: str,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session),
) -> Complaint:
    await ensure_complaints_table_columns(session)
    result = await session.execute(select(ComplaintORM).where(ComplaintORM.id == complaint_id))
    complaint = result.scalar_one_or_none()
    if not complaint:
        raise HTTPException(status_code=404, detail="Complaint not found")
    if current_user.role == "public" and complaint.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")
    return _complaint_to_schema(complaint)


@api_router.patch("/complaints/{complaint_id}", response_model=Complaint)
async def update_complaint_status(
    complaint_id: str,
    update_data: ComplaintStatusUpdate,
    request: Request,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session),
) -> Complaint:
    await ensure_complaints_table_columns(session)
    if current_user.role not in ["admin", "police"]:
        raise HTTPException(status_code=403, detail="Access denied")
    result = await session.execute(select(ComplaintORM).where(ComplaintORM.id == complaint_id))
    complaint = result.scalar_one_or_none()
    if not complaint:
        raise HTTPException(status_code=404, detail="Complaint not found")
    normalized_status = str(update_data.status or "").strip().lower()
    if normalized_status not in {"pending", "investigating", "resolved", "closed", "approved", "rejected"}:
        raise HTTPException(status_code=400, detail="Invalid complaint status")
    _ensure_status_can_change(str(complaint.status), normalized_status)
    if normalized_status == "rejected":
        rejection_reason = str(update_data.rejection_reason or "").strip()
        if not rejection_reason:
            raise HTTPException(status_code=400, detail="Rejection reason is required")
        complaint.rejection_reason = rejection_reason  # type: ignore[assignment]
    else:
        complaint.rejection_reason = None  # type: ignore[assignment]
    complaint.status = normalized_status  # type: ignore[assignment]
    complaint.updated_at = datetime.now(timezone.utc)  # type: ignore[assignment]
    await write_audit_log(
        session,
        current_user,
        request,
        action="complaint_status_update",
        target_type="complaint",
        target_id=complaint_id,
        details={"status": normalized_status},
    )
    await session.commit()
    await session.refresh(complaint)
    return _complaint_to_schema(complaint)


@api_router.patch("/complaints/{complaint_id}/assign", response_model=Complaint)
async def assign_complaint_to_station(
    complaint_id: str,
    assign_data: ComplaintAssignUpdate,
    request: Request,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session),
) -> Complaint:
    await ensure_complaints_table_columns(session)
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admins only")
    station_name = assign_data.station.strip()
    if not station_name:
        raise HTTPException(status_code=400, detail="Station name is required")
    result = await session.execute(select(ComplaintORM).where(ComplaintORM.id == complaint_id))
    complaint = result.scalar_one_or_none()
    if not complaint:
        raise HTTPException(status_code=404, detail="Complaint not found")
    if str(complaint.status or "").strip().lower() in TERMINAL_COMPLAINT_STATUSES:
        raise HTTPException(status_code=409, detail="Complaint is already in a final state")
    complaint.station = station_name  # type: ignore[assignment]
    complaint.updated_at = datetime.now(timezone.utc)  # type: ignore[assignment]
    await write_audit_log(
        session,
        current_user,
        request,
        action="complaint_assign",
        target_type="complaint",
        target_id=complaint_id,
        details={"station": station_name},
    )
    await session.commit()
    await session.refresh(complaint)

    # Send email alert to the assigned station
    try:
        station_result = await session.execute(
            select(StationORM).where(StationORM.name == station_name)
        )
        station_obj = station_result.scalar_one_or_none()
        if station_obj and station_obj.email and all([SMTP_HOST, SMTP_USER, SMTP_PASSWORD]):
            def _send_station_assignment_email(to_email: str, station: str, tracking: str, complaint_type: str, description: str, location: str, incident_date: str) -> None:
                try:
                    msg = email.mime.multipart.MIMEMultipart("alternative")
                    msg["Subject"] = f"[GRP] Complaint Assigned to Your Station – {tracking}"
                    msg["From"] = SMTP_USER
                    msg["To"] = to_email
                    body = (
                        f"Dear {station},\n\n"
                        f"A complaint has been forwarded to your station by the GRP Admin.\n\n"
                        f"Complaint Details\n"
                        f"-----------------\n"
                        f"Tracking Number : {tracking}\n"
                        f"Complaint Type  : {complaint_type}\n"
                        f"Incident Date   : {incident_date}\n"
                        f"Location        : {location}\n"
                        f"Description     : {description}\n\n"
                        f"Please login to the GRP portal to review and take action.\n\n"
                        f"Regards,\nGRP Police Administration"
                    )
                    msg.attach(email.mime.text.MIMEText(body, "plain"))
                    with smtplib.SMTP(SMTP_HOST, SMTP_PORT, timeout=10) as server:
                        server.starttls()
                        server.login(SMTP_USER, SMTP_PASSWORD)
                        server.sendmail(SMTP_USER, to_email, msg.as_string())
                except Exception:
                    pass
            import threading
            threading.Thread(
                target=_send_station_assignment_email,
                args=(
                    station_obj.email,
                    station_name,
                    str(complaint.tracking_number or ""),
                    str(complaint.complaint_type or ""),
                    str(complaint.description or ""),
                    str(complaint.location or ""),
                    str(complaint.incident_date or ""),
                ),
                daemon=True,
            ).start()
    except Exception:
        pass

    # Send email alert to the complainant
    try:
        user_email = getattr(complaint, "complainant_email", None)
        # Fetch station phone (station_obj already fetched above, re-fetch if needed)
        station_phone = ""
        try:
            _sp_result = await session.execute(select(StationORM).where(StationORM.name == station_name))
            _sp_obj = _sp_result.scalar_one_or_none()
            if _sp_obj:
                station_phone = str(_sp_obj.phone or "")
        except Exception:
            pass
        if user_email and all([SMTP_HOST, SMTP_USER, SMTP_PASSWORD]):
            def _send_user_assignment_email(
                to_email: str, name: str, phone: str, address: str,
                tracking: str, station: str, station_ph: str, complaint_type: str, incident_date: str,
                location: str, description: str
            ) -> None:
                try:
                    msg = email.mime.multipart.MIMEMultipart("alternative")
                    msg["Subject"] = f"[GRP AP] Your E-Complaint Has Been Forwarded to Police Station – {tracking}"
                    msg["From"] = SMTP_USER
                    msg["To"] = to_email
                    body = (
                        f"Dear {name or 'Complainant'},\n\n"
                        f"Your E-Complaint has been reviewed by the GRP Central Admin and forwarded to the concerned police station for further action.\n\n"
                        f"{'='*55}\n"
                        f"  YOUR COMPLAINT DETAILS\n"
                        f"{'='*55}\n"
                        f"  Acknowledgement No  : {tracking}\n"
                        f"  Complainant Name    : {name or '-'}\n"
                        f"  Phone Number        : {phone or '-'}\n"
                        f"  Address             : {address or '-'}\n"
                        f"  Complaint Type      : {complaint_type or '-'}\n"
                        f"  Incident Date       : {incident_date or '-'}\n"
                        f"  Incident Location   : {location or '-'}\n"
                        f"  Description         : {description or '-'}\n"
                        f"  Assigned Station    : {station}\n"
                        f"{'='*55}\n\n"
                        f"⚠  IMPORTANT NOTICE\n"
                        f"---------------------\n"
                        f"As per BNSS Section 173, you are required to file a\n"
                        f"PHYSICAL COMPLAINT at the assigned police station\n"
                        f"within 3 DAYS of submitting this E-Complaint.\n\n"
                        f"  Assigned Station : {station}\n"
                        f"  Station Contact  : {station_ph or 'N/A'}\n\n"
                        f"Please carry a printout or screenshot of this email\n"
                        f"along with your Acknowledgement Number when visiting\n"
                        f"the station.\n\n"
                        f"Please retain your Acknowledgement Number ({tracking})\n"
                        f"for all future correspondence regarding this complaint.\n\n"
                        f"Regards,\n"
                        f"GRP Police Administration\n"
                        f"Andhra Pradesh Government Railway Police\n"
                        f"Helpline: 139"
                    )
                    msg.attach(email.mime.text.MIMEText(body, "plain"))
                    with smtplib.SMTP(SMTP_HOST, SMTP_PORT, timeout=10) as server:
                        server.starttls()
                        server.login(SMTP_USER, SMTP_PASSWORD)
                        server.sendmail(SMTP_USER, to_email, msg.as_string())
                except Exception:
                    pass
            import threading
            threading.Thread(
                target=_send_user_assignment_email,
                args=(
                    user_email,
                    str(complaint.complainant_name or ""),
                    str(complainant_phone or ""),
                    str(complainant_address or ""),
                    str(complaint.tracking_number or ""),
                    station_name,
                    station_phone,
                    str(complaint.complaint_type or ""),
                    str(complaint.incident_date or ""),
                    str(complaint.location or ""),
                    str(complaint.description or ""),
                ),
                daemon=True,
            ).start()
    except Exception:
        pass

    return _complaint_to_schema(complaint)


@api_router.delete("/admin/complaints/{complaint_id}")
async def delete_complaint(
    complaint_id: str,
    request: Request,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session),
) -> Any:
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admins only")
    result = await session.execute(select(ComplaintORM).where(ComplaintORM.id == complaint_id))
    complaint = result.scalar_one_or_none()
    if not complaint:
        raise HTTPException(status_code=404, detail="Complaint not found")
    await write_audit_log(
        session,
        current_user,
        request,
        action="complaint_delete",
        target_type="complaint",
        target_id=complaint_id,
        details={"tracking_number": str(complaint.tracking_number or "")},
    )
    await session.delete(complaint)
    await session.commit()
    return JSONResponse(content={"detail": "Complaint deleted"})


# ==================== STATION OFFICER ROUTES ====================
@api_router.get("/station/complaints", response_model=List[Complaint])
async def get_station_complaints(
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session),
) -> List[Complaint]:
    if current_user.role not in ("police", "station"):
        raise HTTPException(status_code=403, detail="Station access only")
    result = await session.execute(select(ComplaintORM).where(ComplaintORM.station == current_user.name))
    return [_complaint_to_schema(c) for c in result.scalars().all()]


@api_router.patch("/station/complaints/{complaint_id}", response_model=Complaint)
async def station_update_complaint_status(
    complaint_id: str,
    update_data: ComplaintStatusUpdate,
    request: Request,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session),
) -> Complaint:
    if current_user.role not in ("police", "station"):
        raise HTTPException(status_code=403, detail="Station access only")
    result = await session.execute(
        select(ComplaintORM).where(
            ComplaintORM.id == complaint_id,
            ComplaintORM.station == current_user.name,
        )
    )
    complaint = result.scalar_one_or_none()
    if not complaint:
        raise HTTPException(status_code=404, detail="Complaint not found")
    normalized_status = str(update_data.status or "").strip().lower()
    if normalized_status not in {"pending", "investigating", "resolved", "approved", "rejected"}:
        raise HTTPException(status_code=400, detail="Invalid complaint status")
    _ensure_status_can_change(str(complaint.status), normalized_status)
    if normalized_status == "rejected":
        rejection_reason = str(update_data.rejection_reason or "").strip()
        if not rejection_reason:
            raise HTTPException(status_code=400, detail="Rejection reason is required")
        complaint.rejection_reason = rejection_reason  # type: ignore[assignment]
    else:
        complaint.rejection_reason = None  # type: ignore[assignment]
    complaint.status = normalized_status  # type: ignore[assignment]
    complaint.updated_at = datetime.now(timezone.utc)  # type: ignore[assignment]
    await write_audit_log(
        session,
        current_user,
        request,
        action="station_complaint_status_update",
        target_type="complaint",
        target_id=complaint_id,
        details={"status": normalized_status},
    )
    await session.commit()
    await session.refresh(complaint)
    return _complaint_to_schema(complaint)


def _ub_orm_to_dict(r: UnidentifiedBodyORM) -> dict:
    media_urls = [_normalize_media_url(item) for item in _decode_media_field(r.image_url)]
    file_names = _decode_media_field(r.image_file_name)
    return {
        "id": r.id,
        "image_url": media_urls[0] if media_urls else "",
        "image_file_name": file_names[0] if file_names else "",
        "media_urls": media_urls,
        "ids": [r.id],
        "station": r.station,
        "district": r.district,
        "reported_date": r.reported_date,
        "description": r.description,
        "uploaded_by": r.uploaded_by,
        "created_at": r.created_at.isoformat() if r.created_at else None,
    }


@api_router.get("/unidentified-bodies")
async def get_all_unidentified_bodies(
    session: AsyncSession = Depends(get_async_session),
) -> Any:
    result = await session.execute(
        select(UnidentifiedBodyORM).order_by(UnidentifiedBodyORM.created_at.desc())
    )
    payload = _merge_unidentified_body_dicts([_ub_orm_to_dict(r) for r in result.scalars().all()])
    return JSONResponse(content=payload)


@api_router.post("/unidentified-bodies")
async def create_unidentified_body(
    files: List[UploadFile] = File(default=[]),
    file: Optional[UploadFile] = File(None),
    reported_date: str = Form(...),
    description: str = Form(...),
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session),
) -> Any:
    # Only allow users whose role does NOT start with IRP, DSRP, SRP, DGP (case-insensitive)
    SPECIAL_STATIONS = [
        "Vijayawada RPS",
        "Guntur RPS",
        "Rajahmundry RPS",
        "Visakhapatnam RPS"
    ]
    role_lower = (current_user.role or "").lower()
    station_row = await _resolve_station_for_user(session, current_user)
    station_name = str(station_row.name) if station_row else str(current_user.name)
    if not (
        (current_user.role == "station") or
        (current_user.role == "irp" and station_name in SPECIAL_STATIONS)
    ):
        raise HTTPException(status_code=403, detail="Station access only")

    upload_files: List[UploadFile] = list(files or [])
    if file is not None:
        upload_files.append(file)
    if not upload_files:
        raise HTTPException(status_code=400, detail="Select at least one image or video file")

    allowed_types = {**IMAGE_MIME_EXTENSIONS, **VIDEO_MIME_EXTENSIONS}
    upload_dir = ROOT_DIR / "unidentified_uploads"
    upload_dir.mkdir(parents=True, exist_ok=True)

    file_names: List[str] = []
    image_urls: List[str] = []
    for upload in upload_files:
        content, ext = await _read_validated_upload(upload, allowed_types, "image or video")
        file_name = f"{uuid.uuid4().hex}{ext}"
        dest = upload_dir / file_name
        with open(dest, "wb") as f:
            f.write(content)
        file_names.append(file_name)
        image_urls.append(f"/unidentified_uploads/{file_name}")

    station_row = await _resolve_station_for_user(session, current_user)
    station_name = str(station_row.name) if station_row else str(current_user.name)
    new_record = UnidentifiedBodyORM(
        id=str(uuid.uuid4()),
        image_url=_encode_media_field(image_urls),
        image_file_name=_encode_media_field(file_names),
        station=station_name,
        district=None,
        reported_date=reported_date,
        description=description.strip(),
        uploaded_by=str(current_user.name),
        created_at=datetime.now(timezone.utc),
    )
    session.add(new_record)
    await session.commit()
    await session.refresh(new_record)
    return JSONResponse(content=_ub_orm_to_dict(new_record))


@api_router.delete("/station/unidentified-bodies/{record_id}")
async def delete_unidentified_body(
    record_id: str,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session),
) -> Any:
    # Only allow users whose role does NOT start with IRP, DSRP, SRP, DGP (case-insensitive)
    SPECIAL_STATIONS = [
        "Vijayawada RPS",
        "Guntur RPS",
        "Rajahmundry RPS",
        "Visakhapatnam RPS"
    ]
    role_lower = (current_user.role or "").lower()
    station_row = await _resolve_station_for_user(session, current_user)
    station_name = str(station_row.name) if station_row else str(current_user.name)
    if not (
        (current_user.role == "station") or
        (current_user.role == "irp" and station_name in SPECIAL_STATIONS)
    ):
        raise HTTPException(status_code=403, detail="Station access only")
    result = await session.execute(
        select(UnidentifiedBodyORM).where(UnidentifiedBodyORM.id == record_id)
    )
    target = result.scalar_one_or_none()
    if not target:
        raise HTTPException(status_code=404, detail="Record not found")
    station_row = await _resolve_station_for_user(session, current_user)
    station_name = str(station_row.name) if station_row else str(current_user.name)
    if target.station != station_name:
        raise HTTPException(status_code=403, detail="Cannot delete another station's record")
    for stored_file_name in _decode_media_field(target.image_file_name):
        file_path = ROOT_DIR / "unidentified_uploads" / stored_file_name
        if file_path.exists():
            file_path.unlink()
    await session.delete(target)
    await session.commit()
    return {"message": "Record deleted"}




@api_router.get("/station/unidentified-bodies", response_model=List[UnidentifiedBodyRecord])
async def get_station_unidentified_bodies(
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session),
) -> List[UnidentifiedBodyRecord]:
    # Only allow users whose role does NOT start with IRP, DSRP, SRP, DGP (case-insensitive)
    SPECIAL_STATIONS = [
        "Vijayawada RPS",
        "Guntur RPS",
        "Rajahmundry RPS",
        "Visakhapatnam RPS"
    ]
    role_lower = (current_user.role or "").lower()
    station_row = await _resolve_station_for_user(session, current_user)
    station_name = str(station_row.name) if station_row else str(current_user.name)
    if not (
        (current_user.role == "station") or
        (current_user.role == "irp" and station_name in SPECIAL_STATIONS)
    ):
        raise HTTPException(status_code=403, detail="Station access only")
    station_row = await _resolve_station_for_user(session, current_user)
    if not station_row:
        raise HTTPException(status_code=404, detail="Unable to resolve station for this account")
    station_name = str(station_row.name)
    result = await session.execute(
        select(UnidentifiedBodyORM)
        .where(UnidentifiedBodyORM.station == station_name)
        .order_by(UnidentifiedBodyORM.created_at.desc())
    )
    return [UnidentifiedBodyRecord(**r) for r in _merge_unidentified_body_dicts([_ub_orm_to_dict(item) for item in result.scalars().all()])]


@api_router.get("/irp/unidentified-bodies", response_model=List[UnidentifiedBodyRecord])
async def get_irp_unidentified_bodies(
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session),
) -> List[UnidentifiedBodyRecord]:
    if current_user.role not in ("police", "irp"):
        raise HTTPException(status_code=403, detail="IRP access only")
    managed = _managed_station_names_for_irp(current_user)
    if not managed:
        raise HTTPException(status_code=403, detail="No IRP circle mapping found for this account")
    result = await session.execute(
        select(UnidentifiedBodyORM)
        .where(UnidentifiedBodyORM.station.in_(managed))
        .order_by(UnidentifiedBodyORM.created_at.desc())
    )
    return [UnidentifiedBodyRecord(**r) for r in _merge_unidentified_body_dicts([_ub_orm_to_dict(item) for item in result.scalars().all()])]


@api_router.get("/dsrp/unidentified-bodies", response_model=List[UnidentifiedBodyRecord])
async def get_dsrp_unidentified_bodies(
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session),
) -> List[UnidentifiedBodyRecord]:
    if current_user.role not in ("police", "dsrp"):
        raise HTTPException(status_code=403, detail="DSRP access only")
    managed = _managed_station_names_for_dsrp(current_user)
    if not managed:
        raise HTTPException(status_code=403, detail="No DSRP subdivision mapping found for this account")
    result = await session.execute(
        select(UnidentifiedBodyORM)
        .where(UnidentifiedBodyORM.station.in_(managed))
        .order_by(UnidentifiedBodyORM.created_at.desc())
    )
    return [UnidentifiedBodyRecord(**r) for r in _merge_unidentified_body_dicts([_ub_orm_to_dict(item) for item in result.scalars().all()])]


@api_router.get("/srp/unidentified-bodies", response_model=List[UnidentifiedBodyRecord])
async def get_srp_unidentified_bodies(
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session),
) -> List[UnidentifiedBodyRecord]:
    if current_user.role not in ("police", "srp"):
        raise HTTPException(status_code=403, detail="SRP access only")
    managed = _managed_station_names_for_srp(current_user)
    if not managed:
        raise HTTPException(status_code=403, detail="No SRP division mapping found for this account")
    result = await session.execute(
        select(UnidentifiedBodyORM)
        .where(UnidentifiedBodyORM.station.in_(managed))
        .order_by(UnidentifiedBodyORM.created_at.desc())
    )
    return [UnidentifiedBodyRecord(**r) for r in _merge_unidentified_body_dicts([_ub_orm_to_dict(item) for item in result.scalars().all()])]


@api_router.get("/dgp/unidentified-bodies", response_model=List[UnidentifiedBodyRecord])
async def get_dgp_unidentified_bodies(
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session),
) -> List[UnidentifiedBodyRecord]:
    if not _is_dgp_user(current_user):
        raise HTTPException(status_code=403, detail="DGP/ADGP/DIG access only")
    result = await session.execute(
        select(UnidentifiedBodyORM).order_by(UnidentifiedBodyORM.created_at.desc())
    )
    return [UnidentifiedBodyRecord(**r) for r in _merge_unidentified_body_dicts([_ub_orm_to_dict(item) for item in result.scalars().all()])]


@api_router.get("/irp/complaints", response_model=List[Complaint])
async def get_irp_complaints(
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session),
) -> List[Complaint]:
    if current_user.role not in ("police", "irp"):
        raise HTTPException(status_code=403, detail="IRP access only")
    managed = _managed_station_names_for_irp(current_user)
    if not managed:
        raise HTTPException(status_code=403, detail="No IRP circle mapping found for this account")
    result = await session.execute(select(ComplaintORM).where(ComplaintORM.station.in_(managed)))
    return [_complaint_to_schema(c) for c in result.scalars().all()]



@api_router.get("/dsrp/complaints", response_model=List[Complaint])
async def get_dsrp_complaints(
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session),
) -> List[Complaint]:
    if current_user.role not in ("police", "dsrp"):
        raise HTTPException(status_code=403, detail="DSRP access only")
    managed = _managed_station_names_for_dsrp(current_user)
    if not managed:
        raise HTTPException(status_code=403, detail="No DSRP subdivision mapping found for this account")
    result = await session.execute(select(ComplaintORM).where(ComplaintORM.station.in_(managed)))
    return [_complaint_to_schema(c) for c in result.scalars().all()]



@api_router.get("/srp/complaints", response_model=List[Complaint])
async def get_srp_complaints(
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session),
) -> List[Complaint]:
    if current_user.role not in ("police", "srp"):
        raise HTTPException(status_code=403, detail="SRP access only")
    managed = _managed_station_names_for_srp(current_user)
    if not managed:
        raise HTTPException(status_code=403, detail="No SRP division mapping found for this account")
    result = await session.execute(select(ComplaintORM).where(ComplaintORM.station.in_(managed)))
    return [_complaint_to_schema(c) for c in result.scalars().all()]



@api_router.get("/dgp/complaints", response_model=List[Complaint])
async def get_dgp_complaints(
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session),
) -> List[Complaint]:
    if not _is_dgp_user(current_user) and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="DGP access only")
    result = await session.execute(select(ComplaintORM))
    return [_complaint_to_schema(c) for c in result.scalars().all()]



# ==================== ADMIN CREDENTIALS ====================
STATION_STOPWORDS = {"rps", "rpop", "rs", "sirp", "hc", "grp", "sub", "division", "circle", "port"}


def build_station_password(name: str) -> str:
    """Return bcrypt-hashed station password derived from name."""
    cleaned = re.sub(r"[^A-Za-z0-9]", "", (name or "station").lower())
    if not cleaned:
        cleaned = "station"
    plain = f"#{cleaned[:1].upper()}{cleaned[1:]}@2026"
    return bcrypt.hashpw(plain.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def _plain_password(stored: str, scope: str, name: str) -> str:
    """Never return a real password. Return a masked placeholder for the UI."""
    return "••••••••"


def _credential_table_for_scope(scope: str) -> Optional[str]:
    return {
        "admin": "admin",
        "officer": "dgp",
        "srp": "srp",
        "dsrp": "dsrp",
        "irp": "irp",
        "station": "stations",
    }.get(scope)


@api_router.get("/admin/credentials", response_model=List[AdminCredentialEntry])
async def get_admin_credentials(
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session),
) -> List[AdminCredentialEntry]:
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admins only")
    await ensure_officer_credentials_table(session)
    await ensure_auth_security_columns(session)
    await ensure_admin_password_patterns(session)
    admin_result = await session.execute(text("SELECT id, email, name, password, is_active FROM admin"))
    admins = admin_result.mappings().all()
    officer_result = await session.execute(text("SELECT id, email, name, password, role, is_active FROM dgp"))
    officers = officer_result.mappings().all()
    sub_officer_result = await session.execute(text("SELECT id, email, name, password, is_active FROM srp"))
    srp_data = sub_officer_result.mappings().all()
    dsrp_result2 = await session.execute(text("SELECT id, email, name, password, is_active FROM dsrp"))
    dsrp_data = dsrp_result2.mappings().all()
    irp_result2 = await session.execute(text("SELECT id, email, name, password, is_active FROM irp"))
    irp_data = irp_result2.mappings().all()
    station_result2 = await session.execute(text("SELECT id, email, name, password, is_active FROM stations"))
    station_data = station_result2.mappings().all()
    admin_rows = [AdminCredentialEntry(scope="admin", id=str(a["id"]), name=str(a["name"]), email=str(a["email"]), password=_plain_password(str(a["password"]), "admin", str(a["name"])), role="admin", is_active=int(a["is_active"] if a["is_active"] is not None else 1) == 1) for a in admins]
    officer_rows = [AdminCredentialEntry(scope="officer", id=str(o["id"]), name=str(o["name"]), email=str(o["email"]), password=_plain_password(str(o["password"]), "dgp", str(o["name"])), role="dgp", is_active=int(o["is_active"] if o["is_active"] is not None else 1) == 1) for o in officers]
    srp_rows = [AdminCredentialEntry(scope="srp", id=str(r["id"]), name=str(r["name"]), email=str(r["email"]), password=_plain_password(str(r["password"]), "srp", str(r["name"])), role="srp", is_active=int(r["is_active"] if r["is_active"] is not None else 1) == 1) for r in srp_data]
    dsrp_rows = [AdminCredentialEntry(scope="dsrp", id=str(r["id"]), name=str(r["name"]), email=str(r["email"]), password=_plain_password(str(r["password"]), "dsrp", str(r["name"])), role="dsrp", is_active=int(r["is_active"] if r["is_active"] is not None else 1) == 1) for r in dsrp_data]
    irp_rows = [AdminCredentialEntry(scope="irp", id=str(r["id"]), name=str(r["name"]), email=str(r["email"]), password=_plain_password(str(r["password"]), "irp", str(r["name"])), role="irp", is_active=int(r["is_active"] if r["is_active"] is not None else 1) == 1) for r in irp_data]
    station_rows = [AdminCredentialEntry(scope="station", id=str(r["id"]), name=str(r["name"]), email=str(r["email"]), password="••••••••", role="station", is_active=int(r["is_active"] if r["is_active"] is not None else 1) == 1) for r in station_data]
    return admin_rows + officer_rows + srp_rows + dsrp_rows + irp_rows + station_rows


@api_router.get("/organization-credentials")
async def get_public_organization_credentials(session: AsyncSession = Depends(get_async_session)) -> Any:
    await ensure_auth_security_columns(session)
    credential_sources = (
        ("srp", "srp"),
        ("dsrp", "dsrp"),
        ("irp", "irp"),
        ("stations", "station"),
    )
    rows: List[Dict[str, Any]] = []
    for table_name, role in credential_sources:
        result = await session.execute(
            text(
                f"""
                SELECT name, phone, division, subdivision, circle, station_name
                FROM {table_name}
                WHERE is_active = 1
                ORDER BY name
                """
            )
        )
        for row in result.mappings().all():
            rows.append(
                {
                    "role": role,
                    "name": str(row["name"] or ""),
                    "phone": str(row["phone"] or ""),
                    "division": str(row["division"] or ""),
                    "subdivision": str(row["subdivision"] or ""),
                    "circle": str(row["circle"] or ""),
                    "station_name": str(row["station_name"] or ""),
                }
            )
    return rows


@api_router.post("/admin/credentials", response_model=AdminCredentialEntry)
async def create_admin_credential(
    body: AdminCredentialCreate,
    request: Request,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session),
) -> AdminCredentialEntry:
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admins only")
    scope = str(body.scope or "").strip().lower()
    table = _credential_table_for_scope(scope)
    if table is None:
        raise HTTPException(status_code=400, detail="Invalid role")
    new_email = str(body.email).strip().lower()
    new_name = re.sub(r"\s+", " ", str(body.name or "").strip())
    if len(new_name) < 2:
        raise HTTPException(status_code=400, detail="Name must be at least 2 characters")
    phone = str(body.phone or "N/A").strip()[:64] or "N/A"
    hierarchy_details = {
        "division": re.sub(r"\s+", " ", str(body.division or "").strip()),
        "subdivision": re.sub(r"\s+", " ", str(body.subdivision or "").strip()),
        "circle": re.sub(r"\s+", " ", str(body.circle or "").strip()),
        "station_name": re.sub(r"\s+", " ", str(body.station_name or "").strip()),
    }
    required_hierarchy = {
        "dsrp": ("division",),
        "irp": ("division", "subdivision"),
        "station": ("division", "subdivision", "circle"),
    }
    for field_name in required_hierarchy.get(scope, ()):
        if not hierarchy_details[field_name]:
            raise HTTPException(status_code=400, detail=f"Select {field_name.replace('_', ' ')}")
    if scope == "station" and not hierarchy_details["station_name"]:
        hierarchy_details["station_name"] = new_name
    role_by_scope = {
        "admin": "admin",
        "officer": "dgp",
        "srp": "srp",
        "dsrp": "dsrp",
        "irp": "irp",
        "station": "station",
    }
    role = role_by_scope.get(scope, scope)
    validate_strong_password(body.password)
    for candidate_table in ("admin", "dgp", "srp", "dsrp", "irp", "stations", "public_users"):
        duplicate = await session.execute(
            text(f"SELECT id FROM {candidate_table} WHERE lower(email) = :email LIMIT 1"),
            {"email": new_email},
        )
        if duplicate.mappings().first():
            raise HTTPException(status_code=409, detail="Username already exists")
    await ensure_auth_security_columns(session)
    entry_id = str(uuid.uuid4())
    hashed_password = hash_password(body.password)
    if table == "admin":
        await session.execute(
            text(
                """
                INSERT INTO admin
                    (id, email, name, phone, password, created_at, must_change_password, is_active, active_session_id)
                VALUES
                    (:id, :email, :name, :phone, :password, :created_at, 1, 1, NULL)
                """
            ),
            {"id": entry_id, "email": new_email, "name": new_name, "phone": phone, "password": hashed_password, "created_at": datetime.utcnow()},
        )
    else:
        await session.execute(
            text(
                f"""
                INSERT INTO {table}
                    (id, email, name, phone, password, role, division, subdivision, circle, station_name, created_at, must_change_password, is_active, active_session_id)
                VALUES
                    (:id, :email, :name, :phone, :password, :role, :division, :subdivision, :circle, :station_name, :created_at, 1, 1, NULL)
                """
            ),
            {
                "id": entry_id,
                "email": new_email,
                "name": new_name,
                "phone": phone,
                "password": hashed_password,
                "role": role,
                "division": hierarchy_details["division"] or None,
                "subdivision": hierarchy_details["subdivision"] or None,
                "circle": hierarchy_details["circle"] or None,
                "station_name": hierarchy_details["station_name"] or None,
                "created_at": datetime.utcnow(),
            },
        )
    await write_audit_log(
        session,
        current_user,
        request,
        action="credential_create",
        target_type=scope,
        target_id=entry_id,
        details={"scope": scope, "email": new_email, "role": role, "hierarchy": hierarchy_details},
    )
    await _remember_password_hash(session, table, entry_id, hashed_password)
    await session.commit()
    return AdminCredentialEntry(
        scope=scope,
        id=entry_id,
        name=new_name,
        email=new_email,
        password="••••••••",
        role=role,
        must_change_password=True,
        is_active=True,
    )


@api_router.get("/admin/audit-logs")
async def get_admin_audit_logs(
    limit: int = 100,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session),
) -> Any:
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admins only")
    safe_limit = min(max(int(limit or 100), 1), 500)
    result = await session.execute(
        text(
            """
            SELECT id, actor_id, actor_role, action, target_type, target_id, ip_address, details, created_at
            FROM audit_logs
            ORDER BY created_at DESC
            LIMIT :limit
            """
        ),
        {"limit": safe_limit},
    )
    return [dict(row) for row in result.mappings().all()]


@api_router.post("/admin/sync-station-admins")
async def sync_station_admins(current_user: User = Depends(get_current_user)) -> Any:
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admins only")
    return {"message": "Station admins synced successfully"}


@api_router.patch("/admin/credentials/{scope}/{entry_id}/password")
async def update_credential_password(
    scope: str,
    entry_id: str,
    body: AdminPasswordUpdate,
    request: Request,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session),
) -> Any:
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admins only")
    plain_password = body.new_password
    validate_strong_password(plain_password)
    table = _credential_table_for_scope(scope)
    if table is None:
        raise HTTPException(status_code=400, detail="Invalid scope")
    if table == "dgp":
        await ensure_officer_credentials_table(session)
    account_result = await session.execute(
        text(f"SELECT password, email, name FROM {table} WHERE id = :id LIMIT 1"),
        {"id": entry_id},
    )
    account = account_result.mappings().first()
    if not account:
        raise HTTPException(status_code=404, detail=f"{scope.upper()} not found")
    await _ensure_password_not_recently_used(session, table, entry_id, plain_password, str(account["password"] or ""))
    hashed_password = bcrypt.hashpw(plain_password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")
    if scope == "srp":
        res = await session.execute(
            text("UPDATE srp SET password = :password, must_change_password = 1, active_session_id = NULL WHERE id = :id"),
            {"password": hashed_password, "id": entry_id},
        )
        if res.rowcount == 0:
            raise HTTPException(status_code=404, detail="SRP not found")
    elif scope == "officer":
        await ensure_officer_credentials_table(session)
        officer_result = await session.execute(
            text("UPDATE dgp SET password = :password, must_change_password = 1, active_session_id = NULL WHERE id = :id"),
            {"password": hashed_password, "id": entry_id},
        )
        if officer_result.rowcount == 0:
            raise HTTPException(status_code=404, detail="Officer not found")
    elif scope == "admin":
        admin_result = await session.execute(
            text("UPDATE admin SET password = :password, must_change_password = 1, active_session_id = NULL WHERE id = :id"),
            {"password": hashed_password, "id": entry_id},
        )
        if admin_result.rowcount == 0:
            raise HTTPException(status_code=404, detail="Admin not found")
    elif scope in ("srp", "dsrp", "irp", "station"):
        res = await session.execute(
            text(f"UPDATE {table} SET password = :password, must_change_password = 1, active_session_id = NULL WHERE id = :id"),
            {"password": hashed_password, "id": entry_id},
        )
        if res.rowcount == 0:
            raise HTTPException(status_code=404, detail=f"{scope.upper()} not found")
    else:
        raise HTTPException(status_code=400, detail="Invalid scope")
    await write_audit_log(
        session,
        current_user,
        request,
        action="credential_password_update",
        target_type=scope,
        target_id=entry_id,
        details={"scope": scope},
    )
    await _remember_password_hash(session, table, entry_id, hashed_password)
    await session.commit()
    _send_security_notification(
        str(account["email"] or ""),
        str(account["name"] or "User"),
        "[GRP AP] Temporary Password Set",
        "Your GRP portal password was changed by an administrator. You must change this temporary password on your next login.",
    )
    return {"message": "Password updated successfully"}


@api_router.patch("/admin/credentials/{scope}/{entry_id}/status")
async def update_credential_status(
    scope: str,
    entry_id: str,
    body: AdminCredentialStatusUpdate,
    request: Request,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session),
) -> Any:
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admins only")
    table = _credential_table_for_scope(scope)
    if table is None:
        raise HTTPException(status_code=400, detail="Invalid scope")
    if table == "admin" and str(current_user.id) == str(entry_id) and not body.is_active:
        raise HTTPException(status_code=400, detail="You cannot disable your own admin account")
    await ensure_auth_security_columns(session)
    active_value = 1 if body.is_active else 0
    result = await session.execute(
        text(f"UPDATE {table} SET is_active = :is_active, active_session_id = CASE WHEN :is_active = 1 THEN active_session_id ELSE NULL END WHERE id = :id"),
        {"is_active": active_value, "id": entry_id},
    )
    if result.rowcount == 0:
        raise HTTPException(status_code=404, detail="Credential not found")
    await write_audit_log(
        session,
        current_user,
        request,
        action="credential_status_update",
        target_type=scope,
        target_id=entry_id,
        details={"scope": scope, "is_active": bool(body.is_active)},
    )
    await session.commit()
    return {"message": "Account enabled successfully" if body.is_active else "Account disabled successfully", "is_active": bool(body.is_active)}


# ==================== ALERTS ROUTES ====================
@api_router.get("/station/alerts", response_model=List[Alert])
async def get_station_alerts(
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session),
) -> List[Alert]:
    """Return alerts targeted at the current station."""
    if current_user.role not in ("police", "station"):
        raise HTTPException(status_code=403, detail="Station access only")
    result = await session.execute(
        select(AlertORM)
        .where(AlertORM.target_station == current_user.name)
        .order_by(desc(AlertORM.created_at))
    )
    alerts = result.scalars().all()
    return [
        Alert(
            id=str(a.id), alert_type=str(a.alert_type), title=str(a.title),
            description=str(a.description), priority=str(a.priority),
            is_active=bool(a.is_active) if isinstance(a.is_active, bool) else str(a.is_active).lower() == "true",
            created_at=a.created_at,
        )
        for a in alerts
    ]


@api_router.get("/alerts", response_model=List[Alert])
async def get_alerts(session: AsyncSession = Depends(get_async_session)) -> List[Alert]:
    result = await session.execute(select(AlertORM).order_by(desc(AlertORM.created_at)))
    alerts = result.scalars().all()
    return [
        Alert(
            id=str(a.id), alert_type=str(a.alert_type), title=str(a.title),
            description=str(a.description), priority=str(a.priority),
            is_active=bool(a.is_active) if isinstance(a.is_active, bool) else str(a.is_active).lower() == "true",
            created_at=a.created_at,
        )
        for a in alerts
    ]


@api_router.post("/admin/alerts", response_model=Alert)
async def admin_create_alert(
    alert_data: AlertCreate,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session),
) -> Alert:
    if current_user.role not in ["police", "admin"]:
        raise HTTPException(status_code=403, detail="Access denied")
    alert_orm = AlertORM(
        id=str(uuid.uuid4()), alert_type=alert_data.alert_type, title=alert_data.title,
        description=alert_data.description, priority=alert_data.priority,
        is_active="true", created_at=datetime.now(timezone.utc),
    )
    session.add(alert_orm)
    await session.commit()
    await session.refresh(alert_orm)
    return Alert(
        id=str(alert_orm.id), alert_type=str(alert_orm.alert_type), title=str(alert_orm.title),
        description=str(alert_orm.description), priority=str(alert_orm.priority),
        is_active=True, created_at=alert_orm.created_at,
    )


# ==================== STATIONS ROUTES ====================
@api_router.get("/stations", response_model=List[Station])
async def get_stations(session: AsyncSession = Depends(get_async_session)) -> List[Station]:
    result = await session.execute(select(StationORM))
    return [
        Station(id=str(s.id), name=str(s.name), phone=str(s.phone), email=str(s.email or ""))
        for s in result.scalars().all()
    ]


@api_router.get("/stations/search")
async def search_stations(q: str, session: AsyncSession = Depends(get_async_session)) -> Any:
    result = await session.execute(
        select(StationORM).where(StationORM.name.ilike(f"%{q}%"))
    )
    return [
        Station(id=str(s.id), name=str(s.name), phone=str(s.phone), email=str(s.email or ""))
        for s in result.scalars().all()
    ]


# ==================== CRIME DATA ROUTES ====================
@api_router.get("/crime-data/summary")
async def get_crime_summary(session: AsyncSession = Depends(get_async_session)) -> Any:
    result = await session.execute(select(CrimeDataORM.crime_type, func.sum(CrimeDataORM.count)).group_by(CrimeDataORM.crime_type))
    summary = {row[0]: row[1] for row in result.all()}
    return {"total_cases": sum(summary.values()), "by_type": summary}


@api_router.get("/crime-data/trends")
async def get_crime_trends(session: AsyncSession = Depends(get_async_session)) -> Any:
    result = await session.execute(select(CrimeDataORM).order_by(desc(CrimeDataORM.year), CrimeDataORM.month.desc()))
    return [CrimeData(id=str(d.id), crime_type=str(d.crime_type), station=str(d.station), count=int(d.count), month=str(d.month), year=int(d.year)) for d in result.scalars().all()]


# ==================== HELP DESK ROUTES ====================
async def _help_request_to_payload(session: AsyncSession, item: HelpRequestORM) -> Dict[str, Any]:
    payload = HelpRequest(**item.__dict__).model_dump(mode="json")
    reply_result = await session.execute(
        text(
            """
            SELECT reply_message, recipient_email, created_at
            FROM help_request_replies
            WHERE help_request_id = :id
            ORDER BY created_at DESC
            """
        ),
        {"id": item.id},
    )
    replies = reply_result.mappings().all()
    payload["reply_count"] = len(replies)
    if replies:
        payload["latest_reply_message"] = replies[0]["reply_message"]
        payload["latest_reply_at"] = replies[0]["created_at"].isoformat() if replies[0]["created_at"] else None
        payload["latest_reply_recipient"] = replies[0]["recipient_email"]
    return payload


@api_router.get("/admin/help-requests")
async def get_all_help_requests(
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session),
) -> Any:
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admins only")
    result = await session.execute(select(HelpRequestORM).order_by(HelpRequestORM.created_at.desc()))
    items = result.scalars().all()
    return JSONResponse(content=[await _help_request_to_payload(session, item) for item in items])


@api_router.patch("/admin/help-requests/{request_id}")
async def update_help_request_status(
    request_id: str,
    body: dict,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session),
) -> Any:
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admins only")
    result = await session.execute(select(HelpRequestORM).where(HelpRequestORM.id == request_id))
    item = result.scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=404, detail="Help request not found")
    item.status = body.get("status", item.status)
    await session.commit()
    await session.refresh(item)
    return JSONResponse(content=await _help_request_to_payload(session, item))


class HelpRequestReplyBody(BaseModel):
    reply_message: str


@api_router.post("/admin/help-requests/{request_id}/reply")
async def reply_to_help_request(
    request_id: str,
    body: HelpRequestReplyBody,
    request: Request,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session),
) -> Any:
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admins only")
    reply_message = str(body.reply_message or "").strip()
    if not reply_message:
        raise HTTPException(status_code=400, detail="Reply message is required")
    if len(reply_message) > 5000:
        raise HTTPException(status_code=400, detail="Reply message is too long")
    result = await session.execute(select(HelpRequestORM).where(HelpRequestORM.id == request_id))
    item = result.scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=404, detail="Help request not found")
    recipient_email = str(item.email or "").strip()
    if not recipient_email:
        raise HTTPException(status_code=400, detail="No email address for this request")
    if not re.fullmatch(r"[^\s@]+@[^\s@]+\.[^\s@]+", recipient_email):
        raise HTTPException(status_code=400, detail="Invalid recipient email address")
    item.replied = 1
    item.status = "replied"  # type: ignore[assignment]
    session.add(HelpRequestReplyORM(
        id=str(uuid.uuid4()),
        help_request_id=request_id,
        reply_message=reply_message,
        recipient_email=recipient_email,
        sent_by_id=current_user.id,
        sent_by_role=current_user.role,
        created_at=datetime.now(timezone.utc),
    ))
    await write_audit_log(
        session,
        current_user,
        request,
        action="help_request_reply",
        target_type="help_request",
        target_id=request_id,
        details={"recipient": recipient_email},
    )
    await session.commit()
    await session.refresh(item)

    if not all([SMTP_HOST, SMTP_USER, SMTP_PASSWORD]):
        return JSONResponse(
            content={
                "success": True,
                "email_sent": False,
                "message": "Reply saved, but email service is not configured",
                "item": await _help_request_to_payload(session, item),
            }
        )

    try:
        msg = email.mime.multipart.MIMEMultipart()
        msg["Subject"] = "Reply from GRP Police Help Desk"
        msg["From"] = SMTP_USER
        msg["To"] = recipient_email
        email_body = (
            f"Dear {item.name},\n\n"
            f"Thank you for contacting the GRP Police Help Desk.\n\n"
            f"Your original message:\n{item.message}\n\n"
            f"Our response:\n{reply_message}\n\n"
            f"Regards,\nGRP Police Administration"
        )
        msg.attach(email.mime.text.MIMEText(email_body, "plain"))
        with smtplib.SMTP(SMTP_HOST, SMTP_PORT, timeout=10) as smtp_server:
            smtp_server.starttls()
            smtp_server.login(SMTP_USER, SMTP_PASSWORD)
            smtp_server.sendmail(SMTP_USER, recipient_email, msg.as_string())
        return JSONResponse(content={"success": True, "email_sent": True, "message": "Reply sent successfully", "item": await _help_request_to_payload(session, item)})
    except Exception as exc:
        logger.warning("Failed to send help request reply email: %s", exc)
        return JSONResponse(
            content={
                "success": True,
                "email_sent": False,
                "message": "Reply saved, but email delivery failed. Please check SMTP configuration.",
                "item": await _help_request_to_payload(session, item),
            },
            status_code=202,
        )


@api_router.post("/help-requests", response_model=HelpRequest)
async def create_help_request(
    request_data: HelpRequestCreate,
    request: Request,
    session: AsyncSession = Depends(get_async_session),
) -> HelpRequest:
    enforce_public_submission_rate_limit(request, "help-requests")
    verify_captcha(request_data.captcha_id, request_data.captcha_answer)
    name = str(request_data.name or "").strip()
    phone = re.sub(r"\D+", "", str(request_data.phone or ""))
    email = str(request_data.email or "").strip()
    message = str(request_data.message or "").strip()
    if not name:
        raise HTTPException(status_code=400, detail="Name is required")
    if not re.fullmatch(r"[6-9]\d{9}", phone):
        raise HTTPException(status_code=400, detail="Enter a valid 10-digit Indian mobile number")
    if email and not re.fullmatch(r"[^\s@]+@[^\s@]+\.[^\s@]+", email):
        raise HTTPException(status_code=400, detail="Enter a valid email address")
    if not message:
        raise HTTPException(status_code=400, detail="Message is required")
    if len(message) > 5000:
        raise HTTPException(status_code=400, detail="Message is too long")
    orm = HelpRequestORM(
        id=str(uuid.uuid4()), name=name, phone=phone,
        email=email, message=message, status="pending",
        created_at=datetime.now(timezone.utc),
    )
    session.add(orm)
    await session.commit()
    await session.refresh(orm)
    return HelpRequest(**orm.__dict__)


# ==================== GALLERY / STATIC CONTENT ROUTES ====================

MANAGED_CONTENT_DIR = ROOT_DIR / "managed_content"

@api_router.get("/page-content/{page_key}")
async def get_page_content(page_key: str) -> Any:
    content_path = MANAGED_CONTENT_DIR / "static_page_content.json"
    try:
        with open(content_path, "r", encoding="utf-8") as f:
            all_content = json.load(f)
        return JSONResponse(content={"content": all_content.get(page_key, {})})
    except FileNotFoundError:
        return JSONResponse(content={"content": {}})

@api_router.put("/admin/page-content/{page_key}")
async def update_page_content(page_key: str, request: Request, current_user: User = Depends(get_current_user)) -> Any:
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admins only")
    content_path = MANAGED_CONTENT_DIR / "static_page_content.json"
    try:
        data = await request.json()
        try:
            with open(content_path, "r", encoding="utf-8") as f:
                all_content = json.load(f)
        except FileNotFoundError:
            all_content = {}
        all_content[page_key] = data.get("content", {})
        with open(content_path, "w", encoding="utf-8") as f:
            json.dump(all_content, f, ensure_ascii=False, indent=2)
        return JSONResponse(content={"content": all_content[page_key]})
    except Exception as e:
        return JSONResponse(content={"detail": f"Failed to update page content: {e}"}, status_code=500)

@api_router.post("/admin/news/upload")
async def admin_upload_news_media(file: UploadFile = File(...), current_user: User = Depends(get_current_user)) -> Any:
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admins only")
    allowed_types = {**IMAGE_MIME_EXTENSIONS, **VIDEO_MIME_EXTENSIONS}
    content, ext = await _read_validated_upload(file, allowed_types, "image or video")
    file_name = f"{uuid.uuid4().hex}{ext}"
    news_dir = ROOT_DIR / "news_uploads"
    news_dir.mkdir(parents=True, exist_ok=True)
    dest = news_dir / file_name
    with open(dest, "wb") as f:
        f.write(content)
    file_url = f"/news_uploads/{file_name}"
    media_type = "video" if (file.content_type or "").lower() in VIDEO_MIME_EXTENSIONS else "image"
    return {"file_url": file_url, "file_name": file_name, "media_type": media_type}


@api_router.put("/admin/gallery-items/{item_id}")
async def admin_update_gallery_item(item_id: str, request: Request, current_user: User = Depends(get_current_user)) -> Any:
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admins only")
    items_path = ROOT_DIR / "gallery_uploads" / "gallery_items.json"
    try:
        data = await request.json()
        try:
            with open(items_path, "r", encoding="utf-8") as f:
                items = json.load(f)
        except FileNotFoundError:
            items = []
        target_idx = next((i for i, item in enumerate(items) if str(item.get("id")) == item_id), None)
        if target_idx is None:
            raise HTTPException(status_code=404, detail="Gallery item not found")
        old_item = items[target_idx]
        new_images = data.get("images", [])
        old_names = {img.get("storedFileName") for img in old_item.get("images", []) if img.get("storedFileName")}
        new_names = {img.get("storedFileName") for img in new_images if img.get("storedFileName")}
        for stored in old_names - new_names:
            img_file = ROOT_DIR / "gallery_uploads" / stored
            if img_file.exists():
                img_file.unlink()
        items[target_idx] = {**old_item, "images": new_images}
        with open(items_path, "w", encoding="utf-8") as f:
            json.dump(items, f, ensure_ascii=False, indent=2)
        return JSONResponse(content=items[target_idx])
    except HTTPException:
        raise
    except Exception as e:
        return JSONResponse(content={"detail": f"Failed to update gallery item: {e}"}, status_code=500)


@api_router.delete("/admin/gallery-items/{item_id}")
async def admin_delete_gallery_item(item_id: str, current_user: User = Depends(get_current_user)) -> Any:
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admins only")
    items_path = ROOT_DIR / "gallery_uploads" / "gallery_items.json"
    try:
        try:
            with open(items_path, "r", encoding="utf-8") as f:
                items = json.load(f)
        except FileNotFoundError:
            items = []
        target = next((i for i in items if str(i.get("id")) == item_id), None)
        if target:
            for img in target.get("images", []):
                stored = img.get("storedFileName")
                if stored:
                    img_file = ROOT_DIR / "gallery_uploads" / stored
                    if img_file.exists():
                        img_file.unlink()
        items = [i for i in items if str(i.get("id")) != item_id]
        with open(items_path, "w", encoding="utf-8") as f:
            json.dump(items, f, ensure_ascii=False, indent=2)
        return {"message": "Gallery item removed"}
    except Exception as e:
        return JSONResponse(content={"detail": f"Failed to remove gallery item: {e}"}, status_code=500)


@api_router.delete("/admin/gallery/upload/{file_name}")
async def admin_delete_gallery_image(file_name: str, current_user: User = Depends(get_current_user)) -> Any:
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admins only")
    img_file = ROOT_DIR / "gallery_uploads" / file_name
    if img_file.exists():
        img_file.unlink()
    return {"message": "Gallery image deleted"}


@api_router.post("/admin/gallery/upload")
async def admin_upload_gallery_media(file: UploadFile = File(...), current_user: User = Depends(get_current_user)) -> Any:
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admins only")
    allowed_types = {**IMAGE_MIME_EXTENSIONS, **VIDEO_MIME_EXTENSIONS}
    content, ext = await _read_validated_upload(file, allowed_types, "image or video")
    file_name = f"{uuid.uuid4().hex}{ext}"
    dest = ROOT_DIR / "gallery_uploads" / file_name
    with open(dest, "wb") as f:
        f.write(content)
    file_url = f"/gallery_uploads/{file_name}"
    return {"file_url": file_url, "file_name": file_name}


@api_router.post("/admin/gallery-items")
async def admin_add_gallery_item(request: Request, current_user: User = Depends(get_current_user)) -> Any:
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admins only")
    items_path = ROOT_DIR / "gallery_uploads" / "gallery_items.json"
    try:
        data = await request.json()
        data["id"] = uuid.uuid4().hex
        data["created_at"] = datetime.now(timezone.utc).isoformat()
        try:
            with open(items_path, "r", encoding="utf-8") as f:
                items = json.load(f)
        except FileNotFoundError:
            items = []
        items.insert(0, data)
        with open(items_path, "w", encoding="utf-8") as f:
            json.dump(items, f, ensure_ascii=False, indent=2)
        return JSONResponse(content=data)
    except Exception as e:
        return JSONResponse(content={"detail": f"Failed to add gallery item: {e}"}, status_code=500)


# ==================== CHAT ENDPOINT ====================

_CHAT_RESPONSES_EN = [
    # Greetings
    (["hello", "hi", "hey", "namaste", "namaskar", "good morning", "good evening", "good afternoon"],
     "Hello! I am GRP AI Assistant. How can I help you today?\n\nI can assist you with:\n• Filing or tracking a complaint\n• Help desk / SOS requests\n• Station locations\n• Women safety (Shakti)\n• India Railways info\n• Awareness & safety tips\n• Emergency helpline 139"),

    # File complaint
    (["file complaint", "lodge complaint", "submit complaint", "register complaint", "how to complain", "file a complaint"],
     "To file a complaint:\n1. Click 'File Complaint' in the navigation menu\n2. Fill in your personal details (name, phone, email)\n3. Describe the incident with date and location\n4. Submit the form\n\nYou will receive a unique Tracking Number to monitor your complaint status anytime."),

    # Track complaint
    (["track complaint", "track my complaint", "complaint status", "check status", "tracking number", "complaint tracking"],
     "To track your complaint:\n1. Go to 'File Complaint' page\n2. Enter your Tracking Number in the 'Track Complaint' section\n3. View the current status: Pending → Investigating → Resolved\n\nYou can also call 139 for complaint status updates."),

    # Complaint status meanings
    (["pending", "investigating", "resolved", "rejected", "closed", "what does status mean"],
     "Complaint status meanings:\n• Pending – Complaint received, under review\n• Investigating – Officers are actively working on it\n• Resolved – Issue has been addressed\n• Rejected – Complaint could not be processed (reason provided)\n• Closed – Case formally closed\n\nFor updates, call 139 or use your tracking number."),

    # Unidentified bodies
    (["unidentified", "dead body", "body found", "corpse", "unknown person", "unidentified body"],
     "GRP maintains records of unidentified bodies found at railway stations and tracks. This information is available through the 'Unidentified Bodies' section on our website. For urgent cases, please contact the nearest GRP station or call 139 immediately."),

    # Help desk / SOS
    (["help desk", "helpdesk", "sos", "help request", "need help", "assistance", "support"],
     "For help requests and SOS:\n• Visit the 'Help Desk' section on our website\n• Submit your request with your name, contact, and description\n• Our team will respond as soon as possible\n\nFor immediate emergencies, call 139 directly."),

    # Emergency
    (["emergency", "urgent", "danger", "accident", "theft", "robbery", "assault", "crime"],
     "For emergencies at railway stations:\n• Call 139 immediately (24/7 GRP Helpline)\n• Contact the nearest GRP station\n• Approach any GRP officer on duty at the platform\n\nDo NOT delay in reporting crimes or accidents at railway stations."),

    # Helpline / contact
    (["139", "helpline", "contact number", "phone number", "call grp", "grp number"],
     "GRP Helpline: 139\n• Available 24 hours, 7 days a week\n• For complaints, emergencies, and general assistance\n• Free to call from any phone\n\nYou can also use our website's Help Desk form for non-urgent requests."),

    # Stations
    (["station", "grp station", "nearest station", "office location", "which station", "station address"],
     "GRP has stations at all major railway stations across Andhra Pradesh. To find the nearest GRP station:\n• Visit the 'Stations' section on our website\n• Stations are organized by district and circle\n• Each station listing includes contact details\n\nAlternatively, call 139 for station location assistance."),

    # Officers / staff
    (["officer", "police officer", "staff", "who is in charge", "sp", "irp", "dsrp", "srp", "dgp"],
     "GRP is organized in a hierarchy:\n• DGP – Director General of Police (Railway)\n• SRP – Superintendent of Railway Police\n• DSRP – Deputy Superintendent of Railway Police\n• IRP – Inspector of Railway Police\n• Station Officers – stationed at each railway station\n\nFor officer contact, visit the nearest GRP station or call 139."),

    # Women safety / Shakti
    (["women", "woman", "female", "girl", "shakti", "women safety", "sexual harassment", "eve teasing", "molestation"],
     "GRP's Shakti initiative is dedicated to women's safety at railway stations.\n• Dedicated women safety helpline: 139\n• Women officers are posted at major stations\n• Report harassment or threats immediately to any GRP officer\n• Visit the 'Women Safety' section on our website for more information and safety tips."),

    # India Railways / train info
    (["train", "railway", "rail", "irctc", "platform", "schedule", "india railways"],
     "For train-related information, visit the 'India Railways' section on our website for quick links to:\n• Indian Railways official portal\n• Train schedule and PNR status\n• Station information\n\nFor safety issues at railway stations, contact GRP at 139."),

    # Awareness / safety tips
    (["awareness", "safety tips", "tips", "campaign", "safe travel", "railway safety"],
     "GRP's Awareness section provides important railway safety tips:\n• Do not leave luggage unattended\n• Report suspicious activity immediately\n• Keep emergency contacts saved (139)\n• Avoid travelling in empty compartments at night\n• Use designated women's coaches\n\nVisit the 'Awareness' section on our website for more safety guidelines."),

    # News / updates
    (["news", "latest news", "update", "announcement", "notification", "press release"],
     "Stay updated with the latest GRP news, announcements, and press releases in the 'Latest News' section on our website. This includes information about new initiatives, campaigns, and important notices from GRP Andhra Pradesh."),

    # About GRP
    (["what is grp", "grp full form", "about grp", "what does grp do", "government railway police", "railway police"],
     "GRP stands for Government Railway Police (ప్రభుత్వ రైల్వే పోలీస్). GRP Andhra Pradesh is responsible for:\n• Maintaining law and order at railway stations\n• Preventing and detecting crimes on trains and stations\n• Protecting passengers and their property\n• Women safety initiatives\n• Emergency response at railway stations"),

    # Register / account / login
    (["register", "account", "sign up", "login", "how to use", "create account"],
     "To use GRP services:\n• No account registration is needed to file a complaint or use the help desk\n• Simply visit the respective section on our website\n• You will receive a tracking number after submitting a complaint\n• Admin and police officer logins are restricted to authorized personnel only"),

    # Website features / how to use the site
    (["website", "portal", "app", "how to use", "features", "what can i do", "services"],
     "GRP website features:\n• File Complaint – Report incidents at railway stations\n• Track Complaint – Check complaint status using tracking number\n• Help Desk – Submit help/SOS requests\n• Stations – Find nearest GRP station\n• Women Safety – Shakti initiative info\n• Awareness – Railway safety tips\n• India Railways – Quick links to train info\n• Latest News – GRP announcements"),

    # Thank you
    (["thank", "thanks", "thank you", "thankyou", "ధన్యవాదాలు", "धन्यवाद"],
     "You're welcome! Stay safe at railway stations. For any emergency, remember to call 139. Is there anything else I can help you with?"),

    # Goodbye
    (["bye", "goodbye", "see you", "exit", "close"],
     "Goodbye! Have a safe journey. Remember, GRP is always here to help. For emergencies call 139."),
]

_CHAT_RESPONSES_TE = [
    # Greetings
    (["నమస్కారం", "హలో", "hello", "hi", "నమస్తే", "శుభోదయం", "శుభసంధ్య"],
     "నమస్కారం! నేను GRP AI సహాయకుడిని. నేను మీకు ఎలా సహాయం చేయగలను?\n\nనేను ఈ విషయాలలో సహాయం చేయగలను:\n• ఫిర్యాదు దాఖలు లేదా ట్రాక్ చేయడం\n• హెల్ప్ డెస్క్ / SOS\n• స్టేషన్ స్థానాలు\n• మహిళా భద్రత (శక్తి)\n• అత్యవసర హెల్ప్‌లైన్ 139"),

    # File complaint
    (["ఫిర్యాదు", "నమోదు", "రిపోర్ట్", "దాఖలు", "ఫిర్యాదు చేయడం", "complaint"],
     "ఫిర్యాదు దాఖలు చేయడానికి:\n1. 'ఫిర్యాదు దాఖలు' పేజీకి వెళ్ళండి\n2. మీ పేరు, ఫోన్, ఇమెయిల్ నమోదు చేయండి\n3. సంఘటన వివరాలు, తేదీ, స్థలం నమోదు చేయండి\n4. Submit చేయండి\n\nమీకు ఒక Tracking Number అందించబడుతుంది, దాని ద్వారా ఫిర్యాదు స్థితిని తెలుసుకోవచ్చు."),

    # Track complaint
    (["ట్రాక్", "స్థితి", "tracking", "తనిఖీ", "ఫిర్యాదు స్థితి"],
     "ఫిర్యాదు స్థితి తెలుసుకోవడానికి:\n1. 'ఫిర్యాదు దాఖలు' పేజీలో 'Track Complaint' విభాగానికి వెళ్ళండి\n2. మీ Tracking Number నమోదు చేయండి\n3. ప్రస్తుత స్థితి చూడండి\n\nఫిర్యాదు స్థితి కోసం 139కి కాల్ చేయవచ్చు."),

    # Emergency
    (["అత్యవసరం", "ప్రమాదం", "దొంగతనం", "నేరం", "సహాయం", "emergency", "danger"],
     "రైల్వే స్టేషన్‌లో అత్యవసర పరిస్థితిలో:\n• వెంటనే 139కి కాల్ చేయండి (24/7)\n• సమీప GRP స్టేషన్‌ను సంప్రదించండి\n• ప్లాట్‌ఫారమ్‌పై ఉన్న GRP అధికారిని సంప్రదించండి\n\nఆలస్యం చేయకుండా నేరాలు లేదా ప్రమాదాలను వెంటనే రిపోర్ట్ చేయండి."),

    # Helpline
    (["139", "హెల్ప్‌లైన్", "నంబర్", "ఫోన్", "కాల్", "సంప్రదించు"],
     "GRP హెల్ప్‌లైన్: 139\n• 24 గంటలు, వారంలో 7 రోజులు అందుబాటులో ఉంటుంది\n• ఫిర్యాదులు, అత్యవసరాలు మరియు సాధారణ సహాయం కోసం\n• ఏ ఫోన్ నుండి అయినా ఉచితంగా కాల్ చేయవచ్చు"),

    # Stations
    (["స్టేషన్", "కార్యాలయం", "చిరునామా", "ఎక్కడ", "దగ్గరలో"],
     "ఆంధ్రప్రదేశ్‌లోని అన్ని ప్రధాన రైల్వే స్టేషన్లలో GRP స్టేషన్లు ఉన్నాయి. వెబ్‌సైట్‌లోని 'Stations' విభాగంలో జిల్లా, సర్కిల్ వారీగా స్టేషన్ వివరాలు మరియు సంప్రదింపు నంబర్లు అందుబాటులో ఉన్నాయి."),

    # Women safety
    (["మహిళ", "అమ్మాయి", "లేడీ", "శక్తి", "భద్రత", "వేధింపు", "women", "shakti"],
     "GRP శక్తి మహిళా భద్రత కార్యక్రమం:\n• రైల్వే స్టేషన్లలో మహిళల భద్రతకు ప్రత్యేక దళం\n• ఏ వేధింపు అయినా వెంటనే 139కి కాల్ చేయండి\n• 'Women Safety' విభాగంలో భద్రతా సూచనలు చదవండి\n• ప్రతి స్టేషన్‌లో మహిళా అధికారులు అందుబాటులో ఉన్నారు"),

    # About GRP
    (["grp అంటే", "grp ఏమిటి", "ప్రభుత్వ రైల్వే పోలీస్", "railway police"],
     "GRP అంటే Government Railway Police (ప్రభుత్వ రైల్వే పోలీస్). GRP Andhra Pradesh is responsible for:\n• Maintaining law and order at railway stations\n• Preventing and detecting crimes on trains and stations\n• Protecting passengers and their property\n• Women safety initiatives\n• Emergency response at railway stations"),

    # Website features
    (["వెబ్‌సైట్", "పోర్టల్", "అప్లికేషన్", "ఎలా వాడాలి", "features", "సేవలు"],
     "GRP వెబ్‌సైట్ సేవలు:\n• ఫిర్యాదు దాఖలు చేయడం\n• ఫిర్యాదు స్థితి తెలుసుకోవడం\n• హెల్ప్ డెస్క్ / SOS\n• స్టేషన్ సమాచారం\n• మహిళా భద్రత (శక్తి)\n• భద్రతా చిట్కాలు\n• తాజా వార్తలు"),

    # Awareness
    (["అవేర్‌నెస్", "భద్రతా చిట్కాలు", "సురక్షిత ప్రయాణం", "awareness"],
     "రైల్వే భద్రతా చిట్కాలు:\n• సామాను నిర్లక్ష్యంగా వదలకండి\n• అనుమానాస్పద కార్యకలాపాలు వెంటనే రిపోర్ట్ చేయండి\n• 139 నంబర్ సేవ్ చేసుకోండి\n• రాత్రిపూట ఖాళీ బోగీలలో ప్రయాణించకండి\n• మహిళలకు నిర్ణీత బోగీలు ఉపయోగించండి"),

    # Thank you
    (["ధన్యవాదాలు", "thanks", "thank", "థాంక్యూ"],
     "స్వాగతం! రైల్వే స్టేషన్లలో సురక్షితంగా ఉండండి. అత్యవసరానికి 139కి కాల్ చేయండి. మీకు మరింత సహాయం అవసరమా?"),

    # Goodbye
    (["వెళ్తున్నాను", "బై", "bye", "goodbye"],
     "చాలా సంతోషం! సురక్షిత ప్రయాణం. అత్యవసరానికి 139కి కాల్ చేయండి. GRP ఎల్లప్పుడూ మీ సేవలో ఉంటుంది."),
]

_DEFAULT_RESPONSE_EN = (
    "I'm here to help with GRP-related queries. You can ask me about:\n"
    "• Filing or tracking a complaint\n"
    "• Help Desk / SOS requests\n"
    "• Emergency helpline (139)\n"
    "• Nearest GRP station locations\n"
    "• Women safety (Shakti initiative)\n"
    "• Railway safety awareness tips\n"
    "• Latest GRP news\n"
    "• About GRP and its services\n\n"
    "For immediate assistance, please call 139."
)

_DEFAULT_RESPONSE_TE = (
    "నేను GRP సంబంధిత ప్రశ్నలకు సహాయం చేయడానికి ఇక్కడ ఉన్నాను. మీరు అడగవచ్చు:\n"
    "• ఫిర్యాదు దాఖలు లేదా ట్రాక్ చేయడం\n"
    "• హెల్ప్ డెస్క్ / SOS\n"
    "• అత్యవసర హెల్ప్‌లైన్ (139)\n"
    "• సమీప GRP స్టేషన్\n"
    "• మహిళా భద్రత (శక్తి)\n"
    "• భద్రతా చిట్కాలు మరియు అవేర్‌నెస్\n\n"
    "తక్షణ సహాయం కోసం 139కి కాల్ చేయండి."
)


def _get_chat_reply(message: str, language: str) -> str:
    msg_lower = message.lower().strip()
    responses = _CHAT_RESPONSES_TE if language == "te" else _CHAT_RESPONSES_EN
    for keywords, reply in responses:
        if any(kw in msg_lower for kw in keywords):
            return reply
    return _DEFAULT_RESPONSE_TE if language == "te" else _DEFAULT_RESPONSE_EN


@api_router.post("/chat")
async def chat_endpoint(request: ChatRequest, session: AsyncSession = Depends(get_async_session)):
    try:
        reply = _get_chat_reply(request.message, request.language)
        return {"response": reply, "session_id": request.session_id}
    except Exception as exc:
        logger.exception("Chat endpoint failed: %s", exc)
        raise HTTPException(status_code=500, detail="Internal server error")


# ==================== INCLUDE ROUTER ====================
app.include_router(api_router)
