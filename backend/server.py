# ==================== IMPORTS ====================
import os
import sys
import json
from dotenv import load_dotenv
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), ".env"))
import ast
import enum
import logging
import re
import uuid
import secrets
import traceback
from pathlib import Path
from datetime import datetime, timezone, timedelta
from typing import Any, Dict, List, Optional

import bcrypt
import jwt
from fastapi import APIRouter, Depends, FastAPI, File, Form, HTTPException, Request, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, EmailStr, Field
try:
    from pydantic import ConfigDict
except ImportError:
    ConfigDict = dict  # type: ignore[assignment,misc]
from sqlalchemy import Column, DateTime, Enum as SAEnum, String, Integer, or_, func, desc
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
SECRET_KEY: str = os.environ.get("JWT_SECRET_KEY", "your-secret-key-change-in-production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7  # 7 days
PASSWORD_NAME_STOPWORDS = {"grp", "sub", "division", "circle", "rps", "rpop", "port", "rs"}

# ==================== FASTAPI APP ====================
app = FastAPI()
security = HTTPBearer()
Base = declarative_base()

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

# ==================== DATABASE ====================
engine = create_async_engine(POSTGRES_URL, echo=True, future=True)
AsyncSessionLocal = sessionmaker(bind=engine, class_=AsyncSession, expire_on_commit=False)  # type: ignore[call-overload]

# ==================== LOGGING ====================
logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)

# ==================== STATIC FILES ====================
# Ensure upload directories exist before mounting
(ROOT_DIR / "gallery_uploads").mkdir(parents=True, exist_ok=True)
(ROOT_DIR / "news_uploads").mkdir(parents=True, exist_ok=True)
(ROOT_DIR / "unidentified_uploads").mkdir(parents=True, exist_ok=True)
_ub_json = ROOT_DIR / "unidentified_uploads" / "unidentified_bodies.json"
if not _ub_json.exists():
    _ub_json.write_text("[]", encoding="utf-8")

app.mount("/gallery_uploads", StaticFiles(directory=str(ROOT_DIR / "gallery_uploads")), name="gallery_uploads")
app.mount("/news_uploads", StaticFiles(directory=str(ROOT_DIR / "news_uploads")), name="news_uploads")
app.mount("/unidentified_uploads", StaticFiles(directory=str(ROOT_DIR / "unidentified_uploads")), name="unidentified_uploads")

# ==================== ROUTER ====================
api_router = APIRouter(prefix="/api")


# ==================== ORM MODELS ====================
class UserRole(str, enum.Enum):
    public = "public"
    admin = "admin"
    dgp = "dgp"
    srp = "srp"
    dsrp = "dsrp"
    irp = "irp"
    station = "station"


class UserORM(Base):
    __tablename__ = "public_users"
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    email = Column(String, unique=True, nullable=False)
    name = Column(String, nullable=False)
    phone = Column(String, nullable=False)
    role = Column(SAEnum(UserRole), default=UserRole.public, nullable=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    password = Column(String, nullable=False)


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
    evidence_urls = Column(String, nullable=True)
    status = Column(String, default="pending", nullable=False)
    rejection_reason = Column(String, nullable=True)
    tracking_number = Column(String, unique=True, nullable=False, default=lambda: f"GRP{uuid.uuid4().hex[:8].upper()}")
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))


class LostItemORM(Base):
    __tablename__ = "lost_items"
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, nullable=False)
    item_type = Column(String, nullable=False)
    description = Column(String, nullable=False)
    lost_location = Column(String, nullable=False)
    lost_date = Column(String, nullable=False)
    contact_phone = Column(String, nullable=False)
    status = Column(String, default="active", nullable=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))


class FoundItemORM(Base):
    __tablename__ = "found_items"
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    item_type = Column(String, nullable=False)
    description = Column(String, nullable=False)
    found_location = Column(String, nullable=False)
    found_date = Column(String, nullable=False)
    station = Column(String, nullable=False)
    status = Column(String, default="unclaimed", nullable=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))


class AlertORM(Base):
    __tablename__ = "alerts"
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    alert_type = Column(String, nullable=False)
    title = Column(String, nullable=False)
    description = Column(String, nullable=False)
    priority = Column(String, default="medium", nullable=False)
    is_active = Column(String, default="true", nullable=False)
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


@app.on_event("startup")
async def ensure_database_tables() -> None:
    core_tables = [
        UserORM.__table__,
        ComplaintORM.__table__,
        AlertORM.__table__,
        StationORM.__table__,
        CrimeDataORM.__table__,
        HelpRequestORM.__table__,
        UnidentifiedBodyORM.__table__,
    ]
    async with engine.begin() as conn:
        await conn.run_sync(lambda sync_conn: Base.metadata.create_all(sync_conn, tables=core_tables))
        await conn.run_sync(AdminModelBase.metadata.create_all)


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


class AdminPasswordUpdate(BaseModel):
    new_password: str


class AdminCredentialEntry(BaseModel):
    scope: str
    id: str
    name: str
    email: str
    password: str
    role: str


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
    evidence_urls: List[str] = []
    status: str = "pending"
    rejection_reason: Optional[str] = None
    tracking_number: str = Field(default_factory=lambda: f"GRP{uuid.uuid4().hex[:8].upper()}")
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class ComplaintCreate(BaseModel):
    complainant_name: str
    complainant_phone: str
    complaint_type: str
    description: str
    location: str
    station: str = "Unassigned"
    incident_date: str
    evidence_urls: List[str] = []


class ComplaintAssignUpdate(BaseModel):
    station: str


class ComplaintStatusUpdate(BaseModel):
    status: str
    rejection_reason: Optional[str] = None


class LostItem(BaseModel):
    model_config = ConfigDict(extra="ignore")  # type: ignore[call-overload]
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    item_type: str
    description: str
    lost_location: str
    lost_date: str
    contact_phone: str
    status: str = "active"
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class LostItemCreate(BaseModel):
    item_type: str
    description: str
    lost_location: str
    lost_date: str
    contact_phone: str


class LostItemUpdate(BaseModel):
    model_config = ConfigDict(extra="ignore")  # type: ignore[call-overload]
    item_type: Optional[str] = None
    description: Optional[str] = None
    lost_location: Optional[str] = None
    lost_date: Optional[str] = None
    contact_phone: Optional[str] = None
    status: Optional[str] = None


class FoundItem(BaseModel):
    model_config = ConfigDict(extra="ignore")  # type: ignore[call-overload]
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    item_type: str
    description: str
    found_location: str
    found_date: str
    station: str
    status: str = "unclaimed"
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class FoundItemCreate(BaseModel):
    item_type: str
    description: str
    found_location: str
    found_date: str
    station: str


class FoundItemUpdate(BaseModel):
    model_config = ConfigDict(extra="ignore")  # type: ignore[call-overload]
    item_type: Optional[str] = None
    description: Optional[str] = None
    found_location: Optional[str] = None
    found_date: Optional[str] = None
    station: Optional[str] = None
    status: Optional[str] = None


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


class HelpRequestCreate(BaseModel):
    name: str
    phone: str
    email: str
    message: str


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
    return f"#{role_label}@{name_label}$"


def build_auth_user_payload(user_id: str, email: str, name: str, phone: str, created_at: Optional[datetime]) -> Dict[str, Any]:
    return {
        "id": user_id,
        "email": email,
        "name": name,
        "phone": phone or "N/A",
        "role": "officer",
        "created_at": created_at or datetime.now(timezone.utc),
    }


def create_access_token(data: Dict[str, Any]) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)  # type: ignore[arg-type]


def _normalize_label(value: str) -> str:
    return re.sub(r"[^a-z0-9]+", "", (value or "").lower())


def _digits_only(value: str) -> str:
    return re.sub(r"\D+", "", str(value or ""))


def _format_superior_officer_label(role: str, name: str) -> str:
    role_key = str(role or "").lower()
    role_upper = role_key.upper()
    if role_key == "dgp":
        cleaned_name = re.sub(r"^(dgp)\s+", "", str(name or ""), flags=re.IGNORECASE).strip()
        return f"DGP {cleaned_name}".strip()
    if role == "srp" and name.startswith("GRP "):
        return f"{role_upper} {name.replace('GRP ', '', 1)}"
    return f"{role_upper} {name}"


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


def _filter_lost_items_for_stations(items: List[LostItemORM], managed_stations: List[str]) -> List[LostItemORM]:
    normalized_tokens = [_normalize_label(s) for s in managed_stations if s]
    if not normalized_tokens:
        return []
    filtered: List[LostItemORM] = []
    for item in items:
        normalized_loc = _normalize_label(str(item.lost_location or ""))
        if any(t and t in normalized_loc for t in normalized_tokens):
            filtered.append(item)
    return filtered


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


# ==================== AUTH ====================
async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    session: AsyncSession = Depends(get_async_session),
) -> User:
    try:
        token = credentials.credentials
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])  # type: ignore[arg-type]

        if payload.get("is_admin"):
            admin_id = payload.get("admin_id")
            if admin_id is None:
                raise HTTPException(status_code=401, detail="Invalid authentication credentials")
            admin_result = await session.execute(
                text("SELECT id, email, name, phone, created_at FROM admin WHERE id = :id LIMIT 1"),
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
            )

        officer_id = payload.get("officer_id")
        if officer_id:
            await ensure_officer_credentials_table(session)
            officer_result = await session.execute(
                text("SELECT id, email, name, phone, created_at FROM dgp WHERE id = :id LIMIT 1"),
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
                role="police",
                created_at=officer["created_at"] or datetime.now(timezone.utc),
            )

        station_id = payload.get("station_id")
        if station_id:
            station_result = await session.execute(
                text("SELECT id, email, name, phone, created_at FROM stations WHERE id = :id LIMIT 1"),
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
            )

        cred_id = payload.get("cred_id")
        cred_role = payload.get("cred_role")
        if cred_id and cred_role:
            table_map = {"srp": "srp", "dsrp": "dsrp", "irp": "irp"}
            cred_table = table_map.get(str(cred_role))
            if cred_table is None:
                raise HTTPException(status_code=401, detail="Invalid credential role")
            cred_result = await session.execute(
                text(f"SELECT id, email, name, phone, created_at FROM {cred_table} WHERE id = :id LIMIT 1"),
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
            )

        user_id = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Invalid authentication credentials")
        result = await session.execute(select(UserORM).where(UserORM.id == user_id))
        user_orm = result.scalar_one_or_none()
        if user_orm is None:
            raise HTTPException(status_code=401, detail="User not found")
        return User(
            id=str(user_orm.id),
            email=str(user_orm.email),
            name=str(user_orm.name),
            phone=str(user_orm.phone) if user_orm.phone else None,
            role=str(user_orm.role.value if hasattr(user_orm.role, "value") else user_orm.role),
            created_at=user_orm.created_at,
        )
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
async def update_latest_news(request: Request) -> Any:
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
        local_items = [item for item in normalized_items if str(item.get("image") or "").startswith("/news_uploads/") or not item.get("image")]
        if local_items:
            return JSONResponse(content=local_items)
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
@api_router.post("/admin/login")
async def admin_login(credentials: AdminLogin, session: AsyncSession = Depends(get_async_session)) -> Any:
    await ensure_admin_password_patterns(session)
    result = await session.execute(
        text("SELECT id, email, name, phone, password, created_at FROM admin WHERE email = :id OR id = :id OR name = :id LIMIT 1"),
        {"id": credentials.identifier},
    )
    admin = result.mappings().first()
    if admin and verify_password(credentials.password, str(admin["password"] or "")):
        access_token = create_access_token({"admin_id": admin["id"], "is_admin": True, "role": "admin"})
        return {
            "msg": "Login successful",
            "portal_role": "admin",
            "admin_id": admin["id"],
            "email": admin["email"],
            "name": admin["name"],
            "access_token": access_token,
            "token_type": "bearer",
        }

    await ensure_officer_credentials_table(session)
    officer_result = await session.execute(
        text("SELECT id, email, name, phone, password, role, created_at FROM dgp WHERE email = :id OR id = :id OR name = :id LIMIT 1"),
        {"id": credentials.identifier},
    )
    officer = officer_result.mappings().first()
    if officer:
        if not verify_password(credentials.password, str(officer["password"] or "")):
            raise HTTPException(status_code=401, detail="Invalid admin credentials")
        access_token = create_access_token({"officer_id": officer["id"], "role": "police"})
        return {
            "msg": "Login successful",
            "portal_role": "officer",
            "officer_role": officer["role"],
            "access_token": access_token,
            "token_type": "bearer",
            "user": build_auth_user_payload(officer["id"], officer["email"], officer["name"], officer["phone"] or "N/A", officer["created_at"]),
        }

    for cred_role in ("station", "srp", "dsrp", "irp"):
        cred_table = "stations" if cred_role == "station" else cred_role
        cred_result = await session.execute(
            text(f"SELECT id, email, name, phone, password, created_at FROM {cred_table} WHERE email = :id OR id = :id OR name = :id LIMIT 1"),
            {"id": credentials.identifier},
        )
        cred = cred_result.mappings().first()
        if cred:
            if not verify_password(credentials.password, str(cred["password"] or "")):
                raise HTTPException(status_code=401, detail=f"Invalid credentials")
            if cred_role == "station":
                access_token = create_access_token({"station_id": cred["id"], "role": "station"})
            else:
                access_token = create_access_token({"cred_id": cred["id"], "cred_role": cred_role})
            return {
                "msg": "Login successful",
                "portal_role": "officer",
                "officer_role": cred_role,
                "access_token": access_token,
                "token_type": "bearer",
                "user": build_auth_user_payload(cred["id"], cred["email"], cred["name"], cred["phone"] or "N/A", cred["created_at"]),
            }

    raise HTTPException(status_code=401, detail="Invalid credentials")


@api_router.get("/admin/login-options", response_model=List[AdminLoginOption])
async def get_admin_login_options(session: AsyncSession = Depends(get_async_session)) -> List[AdminLoginOption]:
    try:
        await ensure_officer_credentials_table(session)
        await ensure_admin_password_patterns(session)

        admin_result = await session.execute(text("SELECT id, name FROM admin ORDER BY name, id"))
        admins = admin_result.mappings().all()

        officer_result = await session.execute(text("SELECT id, name, role FROM dgp ORDER BY CASE role WHEN 'dgp' THEN 1 WHEN 'adgp' THEN 2 WHEN 'dig' THEN 3 ELSE 4 END"))
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
                scope="officer", account_role=str(superior_row["role"]), group="Superior Officers",
            ))

        grouped_result = await session.execute(text("SELECT id, name FROM srp ORDER BY name"))
        for row in grouped_result.mappings().all():
            options.append(AdminLoginOption(identifier=str(row["id"]), label=str(row["name"]), scope="srp", account_role="srp", group="SRP"))

        dsrp_result = await session.execute(text("SELECT id, name FROM dsrp ORDER BY name"))
        for row in dsrp_result.mappings().all():
            options.append(AdminLoginOption(identifier=str(row["id"]), label=str(row["name"]), scope="dsrp", account_role="dsrp", group="DSRP"))

        irp_result = await session.execute(text("SELECT id, name FROM irp ORDER BY name"))
        for row in irp_result.mappings().all():
            options.append(AdminLoginOption(identifier=str(row["id"]), label=str(row["name"]), scope="irp", account_role="irp", group="IRP"))

        station_result = await session.execute(text("SELECT id, name FROM stations ORDER BY name"))
        for s in station_result.mappings().all():
            options.append(AdminLoginOption(identifier=str(s["id"]), label=str(s["name"]), scope="station", account_role="station", group="Stations"))

        return options
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Internal Server Error: {e}")


@api_router.get("/auth/me", response_model=User)
async def get_me(current_user: User = Depends(get_current_user)) -> User:
    return current_user


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
    result = await session.execute(select(UserORM).where(UserORM.name == data.name, UserORM.role == UserRole.srp))
    existing = result.scalar_one_or_none()
    hashed_password = hash_password(data.password)
    if existing:
        existing.email = data.email  # type: ignore[assignment]
        existing.phone = data.phone or existing.phone  # type: ignore[assignment]
        existing.password = hashed_password  # type: ignore[assignment]
        await session.commit()
        await session.refresh(existing)
        return AdminCredentialEntry(
            scope="user", id=str(existing.id), name=str(existing.name),
            email=str(existing.email), password=str(existing.password), role="srp",
        )
    new_user = UserORM(
        id=str(uuid.uuid4()), email=data.email, name=data.name,
        phone=data.phone or "", role=UserRole.srp,
        created_at=datetime.now(timezone.utc), password=hashed_password,
    )
    session.add(new_user)
    await session.commit()
    await session.refresh(new_user)
    return AdminCredentialEntry(
        scope="user", id=str(new_user.id), name=str(new_user.name),
        email=str(new_user.email), password=str(new_user.password), role="srp",
    )


# ==================== COMPLAINT ROUTES ====================
def _complaint_to_schema(c: ComplaintORM) -> Complaint:
    return Complaint(
        id=str(c.id), user_id=str(c.user_id),
        complainant_name=c.complainant_name,
        complainant_phone=c.complainant_phone,
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
    complaint_data: ComplaintCreate,
    session: AsyncSession = Depends(get_async_session),
) -> Complaint:
    await ensure_complaints_table_columns(session)
    evidence_urls = ",".join(complaint_data.evidence_urls) if complaint_data.evidence_urls else ""
    complaint_orm = ComplaintORM(
        id=str(uuid.uuid4()), user_id="anonymous",
        complainant_name=complaint_data.complainant_name,
        complainant_phone=complaint_data.complainant_phone,
        complaint_type=complaint_data.complaint_type, description=complaint_data.description,
        location=complaint_data.location, station=complaint_data.station,
        incident_date=complaint_data.incident_date, evidence_urls=evidence_urls,
        status="pending", rejection_reason=None,
        tracking_number=f"GRP{uuid.uuid4().hex[:8].upper()}",
        created_at=datetime.now(timezone.utc), updated_at=datetime.now(timezone.utc),
    )
    session.add(complaint_orm)
    await session.commit()
    await session.refresh(complaint_orm)
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


@api_router.get("/complaints/track/{tracking_number}", response_model=Complaint)
async def track_complaint(tracking_number: str, session: AsyncSession = Depends(get_async_session)) -> Complaint:
    await ensure_complaints_table_columns(session)
    result = await session.execute(select(ComplaintORM).where(ComplaintORM.tracking_number == tracking_number))
    complaint = result.scalar_one_or_none()
    if not complaint:
        raise HTTPException(status_code=404, detail="Complaint not found")
    return _complaint_to_schema(complaint)


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
    if normalized_status == "rejected":
        rejection_reason = str(update_data.rejection_reason or "").strip()
        if not rejection_reason:
            raise HTTPException(status_code=400, detail="Rejection reason is required")
        complaint.rejection_reason = rejection_reason  # type: ignore[assignment]
    else:
        complaint.rejection_reason = None  # type: ignore[assignment]
    complaint.status = normalized_status  # type: ignore[assignment]
    complaint.updated_at = datetime.now(timezone.utc)  # type: ignore[assignment]
    await session.commit()
    await session.refresh(complaint)
    return _complaint_to_schema(complaint)


@api_router.patch("/complaints/{complaint_id}/assign", response_model=Complaint)
async def assign_complaint_to_station(
    complaint_id: str,
    assign_data: ComplaintAssignUpdate,
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
    complaint.station = station_name  # type: ignore[assignment]
    complaint.updated_at = datetime.now(timezone.utc)  # type: ignore[assignment]
    await session.commit()
    await session.refresh(complaint)
    return _complaint_to_schema(complaint)


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


@api_router.get("/station/lost-items", response_model=List[LostItem])
async def get_station_lost_items(
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session),
) -> List[LostItem]:
    if current_user.role not in ("police", "station"):
        raise HTTPException(status_code=403, detail="Station access only")
    result = await session.execute(select(LostItemORM))
    filtered = _filter_lost_items_for_stations(result.scalars().all(), [current_user.name])
    return [LostItem(**item.__dict__) for item in filtered]


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
    files: Optional[List[UploadFile]] = File(None),
    file: Optional[UploadFile] = File(None),
    reported_date: str = Form(...),
    description: str = Form(...),
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session),
) -> Any:
    if current_user.role not in ("police", "station"):
        raise HTTPException(status_code=403, detail="Station access only")
    if (
        _is_dgp_user(current_user)
        or _managed_station_names_for_irp(current_user)
        or _managed_station_names_for_dsrp(current_user)
        or _managed_station_names_for_srp(current_user)
    ):
        raise HTTPException(status_code=403, detail="Station access only")

    upload_files: List[UploadFile] = list(files or [])
    if file is not None:
        upload_files.append(file)
    if not upload_files:
        raise HTTPException(status_code=400, detail="Select at least one image or video file")

    allowed_types = {"image/jpeg", "image/png", "image/gif", "image/webp", "image/avif",
                     "video/mp4", "video/webm", "video/ogg", "video/quicktime", "video/x-msvideo"}
    upload_dir = ROOT_DIR / "unidentified_uploads"
    upload_dir.mkdir(parents=True, exist_ok=True)

    file_names: List[str] = []
    image_urls: List[str] = []
    for upload in upload_files:
        if upload.content_type not in allowed_types:
            raise HTTPException(status_code=400, detail="Only image or video files are allowed")
        ext = Path(upload.filename).suffix if upload.filename else ".jpg"
        file_name = f"{uuid.uuid4().hex}{ext}"
        dest = upload_dir / file_name
        content = await upload.read()
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
    if current_user.role not in ("police", "station"):
        raise HTTPException(status_code=403, detail="Station access only")
    if (
        _is_dgp_user(current_user)
        or _managed_station_names_for_irp(current_user)
        or _managed_station_names_for_dsrp(current_user)
        or _managed_station_names_for_srp(current_user)
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
    if current_user.role not in ("police", "station"):
        raise HTTPException(status_code=403, detail="Station access only")
    if (
        _is_dgp_user(current_user)
        or _managed_station_names_for_irp(current_user)
        or _managed_station_names_for_dsrp(current_user)
        or _managed_station_names_for_srp(current_user)
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


@api_router.get("/irp/lost-items", response_model=List[LostItem])
async def get_irp_lost_items(
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session),
) -> List[LostItem]:
    if current_user.role not in ("police", "irp"):
        raise HTTPException(status_code=403, detail="IRP access only")
    managed = _managed_station_names_for_irp(current_user)
    if not managed:
        raise HTTPException(status_code=403, detail="No IRP circle mapping found for this account")
    result = await session.execute(select(LostItemORM))
    filtered = _filter_lost_items_for_stations(result.scalars().all(), managed)
    return [LostItem(**item.__dict__) for item in filtered]


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


@api_router.get("/dsrp/lost-items", response_model=List[LostItem])
async def get_dsrp_lost_items(
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session),
) -> List[LostItem]:
    if current_user.role not in ("police", "dsrp"):
        raise HTTPException(status_code=403, detail="DSRP access only")
    managed = _managed_station_names_for_dsrp(current_user)
    if not managed:
        raise HTTPException(status_code=403, detail="No DSRP subdivision mapping found for this account")
    result = await session.execute(select(LostItemORM))
    filtered = _filter_lost_items_for_stations(result.scalars().all(), managed)
    return [LostItem(**item.__dict__) for item in filtered]


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


@api_router.get("/srp/lost-items", response_model=List[LostItem])
async def get_srp_lost_items(
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session),
) -> List[LostItem]:
    if current_user.role not in ("police", "srp"):
        raise HTTPException(status_code=403, detail="SRP access only")
    managed = _managed_station_names_for_srp(current_user)
    if not managed:
        raise HTTPException(status_code=403, detail="No SRP division mapping found for this account")
    result = await session.execute(select(LostItemORM))
    filtered = _filter_lost_items_for_stations(result.scalars().all(), managed)
    return [LostItem(**item.__dict__) for item in filtered]


@api_router.get("/dgp/complaints", response_model=List[Complaint])
async def get_dgp_complaints(
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session),
) -> List[Complaint]:
    if not _is_dgp_user(current_user) and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="DGP access only")
    result = await session.execute(select(ComplaintORM))
    return [_complaint_to_schema(c) for c in result.scalars().all()]


@api_router.get("/dgp/lost-items", response_model=List[LostItem])
async def get_dgp_lost_items(
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session),
) -> List[LostItem]:
    if not _is_dgp_user(current_user) and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="DGP access only")
    result = await session.execute(select(LostItemORM))
    return [LostItem(**item.__dict__) for item in result.scalars().all()]


# ==================== ADMIN CREDENTIALS ====================
STATION_STOPWORDS = {"rps", "rpop", "rs", "sirp", "hc", "grp", "sub", "division", "circle", "port"}


def build_station_password(name: str) -> str:
    """Return station password in the format #Stationname@2026."""
    cleaned = re.sub(r"[^A-Za-z0-9]", "", (name or "station").lower())
    if not cleaned:
        cleaned = "station"
    return f"#{cleaned[:1].upper()}{cleaned[1:]}@2026"


def _plain_password(stored: str, scope: str, name: str) -> str:
    """Return plain-text password. If stored value is a bcrypt hash, reconstruct the default pattern."""
    if stored and stored.startswith("$2b$"):
        if scope == "station":
            return build_station_password(name)
        return build_managed_password(scope, name)
    return stored or ""


@api_router.get("/admin/credentials", response_model=List[AdminCredentialEntry])
async def get_admin_credentials(
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session),
) -> List[AdminCredentialEntry]:
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admins only")
    await ensure_officer_credentials_table(session)
    await ensure_admin_password_patterns(session)
    admin_result = await session.execute(text("SELECT id, email, name, password FROM admin"))
    admins = admin_result.mappings().all()
    officer_result = await session.execute(text("SELECT id, email, name, password, role FROM dgp"))
    officers = officer_result.mappings().all()
    sub_officer_result = await session.execute(text("SELECT id, email, name, password FROM srp"))
    srp_data = sub_officer_result.mappings().all()
    dsrp_result2 = await session.execute(text("SELECT id, email, name, password FROM dsrp"))
    dsrp_data = dsrp_result2.mappings().all()
    irp_result2 = await session.execute(text("SELECT id, email, name, password FROM irp"))
    irp_data = irp_result2.mappings().all()
    station_result2 = await session.execute(text("SELECT id, email, name, password FROM stations"))
    station_data = station_result2.mappings().all()
    admin_rows = [AdminCredentialEntry(scope="admin", id=str(a["id"]), name=str(a["name"]), email=str(a["email"]), password=_plain_password(str(a["password"]), "admin", str(a["name"])), role="admin") for a in admins]
    officer_rows = [AdminCredentialEntry(scope="officer", id=str(o["id"]), name=str(o["name"]), email=str(o["email"]), password=_plain_password(str(o["password"]), str(o["role"]), str(o["name"])), role=str(o["role"])) for o in officers]
    srp_rows = [AdminCredentialEntry(scope="srp", id=str(r["id"]), name=str(r["name"]), email=str(r["email"]), password=_plain_password(str(r["password"]), "srp", str(r["name"])), role="srp") for r in srp_data]
    dsrp_rows = [AdminCredentialEntry(scope="dsrp", id=str(r["id"]), name=str(r["name"]), email=str(r["email"]), password=_plain_password(str(r["password"]), "dsrp", str(r["name"])), role="dsrp") for r in dsrp_data]
    irp_rows = [AdminCredentialEntry(scope="irp", id=str(r["id"]), name=str(r["name"]), email=str(r["email"]), password=_plain_password(str(r["password"]), "irp", str(r["name"])), role="irp") for r in irp_data]
    station_rows = [AdminCredentialEntry(scope="station", id=str(r["id"]), name=str(r["name"]), email=str(r["email"]), password=build_station_password(str(r["name"])), role="station") for r in station_data]
    return admin_rows + officer_rows + srp_rows + dsrp_rows + irp_rows + station_rows


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
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session),
) -> Any:
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admins only")
    plain_password = body.new_password
    if scope == "user":
        result = await session.execute(select(UserORM).where(UserORM.id == entry_id))
        user = result.scalar_one_or_none()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        user.password = plain_password  # type: ignore[assignment]
    elif scope == "officer":
        await ensure_officer_credentials_table(session)
        officer_result = await session.execute(
            text("UPDATE dgp SET password = :password WHERE id = :id"),
            {"password": plain_password, "id": entry_id},
        )
        if officer_result.rowcount == 0:
            raise HTTPException(status_code=404, detail="Officer not found")
    elif scope == "admin":
        admin_result = await session.execute(
            text("UPDATE admin SET password = :password WHERE id = :id"),
            {"password": plain_password, "id": entry_id},
        )
        if admin_result.rowcount == 0:
            raise HTTPException(status_code=404, detail="Admin not found")
    elif scope in ("srp", "dsrp", "irp", "station"):
        table = scope if scope != "station" else "stations"
        res = await session.execute(
            text(f"UPDATE {table} SET password = :password WHERE id = :id"),
            {"password": plain_password, "id": entry_id},
        )
        if res.rowcount == 0:
            raise HTTPException(status_code=404, detail=f"{scope.upper()} not found")
    else:
        raise HTTPException(status_code=400, detail="Invalid scope")
    await session.commit()
    return {"message": "Password updated successfully"}


# ==================== LOST & FOUND ROUTES ====================
@api_router.post("/lost-items", response_model=LostItem)
async def report_lost_item(
    item_data: LostItemCreate,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session),
) -> LostItem:
    lost_item_orm = LostItemORM(
        id=str(uuid.uuid4()), user_id=current_user.id,
        item_type=item_data.item_type, description=item_data.description,
        lost_location=item_data.lost_location, lost_date=item_data.lost_date,
        contact_phone=item_data.contact_phone, status="active",
        created_at=datetime.now(timezone.utc),
    )
    session.add(lost_item_orm)
    await session.commit()
    await session.refresh(lost_item_orm)
    return LostItem(**lost_item_orm.__dict__)


@api_router.get("/lost-items", response_model=List[LostItem])
async def get_lost_items(
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session),
) -> List[LostItem]:
    stmt = select(LostItemORM) if current_user.role == "admin" else select(LostItemORM).where(LostItemORM.user_id == current_user.id)
    result = await session.execute(stmt)
    return [LostItem(**item.__dict__) for item in result.scalars().all()]


@api_router.patch("/lost-items/{item_id}", response_model=LostItem)
async def update_lost_item(
    item_id: str,
    item_data: LostItemUpdate,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session),
) -> LostItem:
    result = await session.execute(select(LostItemORM).where(LostItemORM.id == item_id))
    item = result.scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=404, detail="Lost item not found")
    if current_user.role not in ["admin", "police"] and item.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")
    updates = item_data.model_dump(exclude_unset=True, exclude_none=True)
    for field, value in updates.items():
        setattr(item, field, value)
    await session.commit()
    await session.refresh(item)
    return LostItem(**item.__dict__)


@api_router.delete("/lost-items/{item_id}")
async def delete_lost_item(
    item_id: str,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session),
) -> Any:
    result = await session.execute(select(LostItemORM).where(LostItemORM.id == item_id))
    item = result.scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=404, detail="Lost item not found")
    if current_user.role not in ["admin", "police"] and item.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")
    await session.delete(item)
    await session.commit()
    return {"message": "Lost item deleted successfully"}


@api_router.get("/found-items", response_model=List[FoundItem])
async def get_found_items(session: AsyncSession = Depends(get_async_session)) -> List[FoundItem]:
    result = await session.execute(select(FoundItemORM).where(FoundItemORM.status == "unclaimed"))
    return [FoundItem(**item.__dict__) for item in result.scalars().all()]


@api_router.post("/admin/found-items", response_model=FoundItem)
async def admin_add_found_item(
    item_data: FoundItemCreate,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session),
) -> FoundItem:
    if current_user.role not in ["police", "admin"]:
        raise HTTPException(status_code=403, detail="Access denied")
    found_item_orm = FoundItemORM(
        id=str(uuid.uuid4()), item_type=item_data.item_type, description=item_data.description,
        found_location=item_data.found_location, found_date=item_data.found_date,
        station=item_data.station, status="unclaimed", created_at=datetime.now(timezone.utc),
    )
    session.add(found_item_orm)
    await session.commit()
    await session.refresh(found_item_orm)
    return FoundItem(**found_item_orm.__dict__)


@api_router.get("/admin/found-items", response_model=List[FoundItem])
async def admin_get_found_items(
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session),
) -> List[FoundItem]:
    if current_user.role not in ["admin", "police"]:
        raise HTTPException(status_code=403, detail="Access denied")
    result = await session.execute(select(FoundItemORM).order_by(desc(FoundItemORM.created_at)))
    return [FoundItem(**item.__dict__) for item in result.scalars().all()]


@api_router.patch("/found-items/{item_id}", response_model=FoundItem)
async def update_found_item(
    item_id: str,
    item_data: FoundItemUpdate,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session),
) -> FoundItem:
    if current_user.role not in ["admin", "police"]:
        raise HTTPException(status_code=403, detail="Access denied")
    result = await session.execute(select(FoundItemORM).where(FoundItemORM.id == item_id))
    item = result.scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=404, detail="Found item not found")
    for field, value in item_data.model_dump(exclude_unset=True, exclude_none=True).items():
        setattr(item, field, value)
    await session.commit()
    await session.refresh(item)
    return FoundItem(**item.__dict__)


@api_router.delete("/found-items/{item_id}")
async def delete_found_item(
    item_id: str,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session),
) -> Any:
    if current_user.role not in ["admin", "police"]:
        raise HTTPException(status_code=403, detail="Access denied")
    result = await session.execute(select(FoundItemORM).where(FoundItemORM.id == item_id))
    item = result.scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=404, detail="Found item not found")
    await session.delete(item)
    await session.commit()
    return {"message": "Found item deleted successfully"}


# ==================== ALERTS ROUTES ====================
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
@api_router.get("/admin/help-requests")
async def get_all_help_requests(
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session),
) -> Any:
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admins only")
    result = await session.execute(select(HelpRequestORM).order_by(HelpRequestORM.created_at.desc()))
    items = result.scalars().all()
    return JSONResponse(content=[HelpRequest(**item.__dict__).model_dump(mode="json") for item in items])


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
    return JSONResponse(content=HelpRequest(**item.__dict__).model_dump(mode="json"))


@api_router.post("/help-requests", response_model=HelpRequest)
async def create_help_request(
    request_data: HelpRequestCreate,
    session: AsyncSession = Depends(get_async_session),
) -> HelpRequest:
    orm = HelpRequestORM(
        id=str(uuid.uuid4()), name=request_data.name, phone=request_data.phone,
        email=request_data.email, message=request_data.message, status="pending",
        created_at=datetime.now(timezone.utc),
    )
    session.add(orm)
    await session.commit()
    await session.refresh(orm)
    return HelpRequest(**orm.__dict__)


# ==================== GALLERY / STATIC CONTENT ROUTES ====================
@api_router.post("/admin/news/upload")
async def admin_upload_news_media(file: UploadFile = File(...), current_user: User = Depends(get_current_user)) -> Any:
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admins only")
    allowed_image = {"image/jpeg", "image/png", "image/gif", "image/webp", "image/avif"}
    allowed_video = {"video/mp4", "video/webm", "video/ogg", "video/quicktime", "video/x-msvideo"}
    if file.content_type not in allowed_image | allowed_video:
        raise HTTPException(status_code=400, detail="Only image or video files are allowed")
    ext = Path(file.filename).suffix if file.filename else ""
    file_name = f"{uuid.uuid4().hex}{ext}"
    news_dir = ROOT_DIR / "news_uploads"
    news_dir.mkdir(parents=True, exist_ok=True)
    dest = news_dir / file_name
    content = await file.read()
    with open(dest, "wb") as f:
        f.write(content)
    file_url = f"/news_uploads/{file_name}"
    media_type = "video" if file.content_type in allowed_video else "image"
    return {"file_url": file_url, "file_name": file_name, "media_type": media_type}


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
    allowed_types = {"image/jpeg", "image/png", "image/gif", "image/webp", "image/avif",
                     "video/mp4", "video/webm", "video/ogg", "video/quicktime", "video/x-msvideo"}
    if file.content_type not in allowed_types:
        raise HTTPException(status_code=400, detail="Only image or video files are allowed")
    ext = Path(file.filename).suffix if file.filename else ""
    file_name = f"{uuid.uuid4().hex}{ext}"
    dest = ROOT_DIR / "gallery_uploads" / file_name
    content = await file.read()
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


# ==================== INCLUDE ROUTER ====================
app.include_router(api_router)
