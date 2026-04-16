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
    aadhar_number = Column(String, nullable=True)
    aadhar_file = Column(String, nullable=True)
    address = Column(String, nullable=True)
    state = Column(String, nullable=True)
    complainant_email = Column(String, nullable=True)
    supporting_docs = Column(String, nullable=True)
    evidence_urls = Column(String, nullable=True)
    status = Column(String, default="pending", nullable=False)
    rejection_reason = Column(String, nullable=True)
    tracking_number = Column(String, unique=True, nullable=False, default=lambda: f"GRP{uuid.uuid4().hex[:8].upper()}")
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
    aadhar_number: Optional[str] = None
    aadhar_file: Optional[str] = None
    address: Optional[str] = None
    state: Optional[str] = None
    complainant_email: Optional[str] = None
    supporting_docs: Optional[str] = None
    evidence_urls: List[str] = []
    status: str = "pending"
    rejection_reason: Optional[str] = None
    tracking_number: str = Field(default_factory=lambda: f"GRP{uuid.uuid4().hex[:8].upper()}")
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class ComplaintCreate(BaseModel):
    complainant_name: str
    complainant_phone: str
    complainant_email: str
    aadhar_number: str
    address: str
    state: Optional[str] = None
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
        text("ALTER TABLE complaints ADD COLUMN IF NOT EXISTS aadhar_number VARCHAR")
    )
    await session.execute(
        text("ALTER TABLE complaints ADD COLUMN IF NOT EXISTS aadhar_file VARCHAR")
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
                role="dgp",
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
        access_token = create_access_token({"officer_id": officer["id"], "officer_role": "dgp"})
        return {
            "msg": "Login successful",
            "portal_role": "officer",
            "officer_role": "dgp",
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
            email=data.email, password=hashed_password, role="srp",
        )
    new_id = str(uuid.uuid4())
    await session.execute(
        text("INSERT INTO srp (id, email, name, phone, password, role, created_at) VALUES (:id, :email, :name, :phone, :password, 'srp', :created_at)"),
        {"id": new_id, "email": data.email, "name": data.name, "phone": data.phone or "", "password": hashed_password, "created_at": datetime.now(timezone.utc)},
    )
    await session.commit()
    return AdminCredentialEntry(
        scope="srp", id=new_id, name=data.name,
        email=data.email, password=hashed_password, role="srp",
    )


# ==================== COMPLAINT ROUTES ====================
def _complaint_to_schema(c: ComplaintORM) -> Complaint:
    return Complaint(
        id=str(c.id), user_id=str(c.user_id),
        complainant_name=c.complainant_name,
        complainant_phone=c.complainant_phone,
        aadhar_number=c.aadhar_number,
        aadhar_file=c.aadhar_file,
        address=c.address,
        state=c.state,
        complainant_email=c.complainant_email,
        supporting_docs=c.supporting_docs,
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
    complainant_name: str = Form(...),
    complainant_phone: str = Form(...),
    complainant_email: str = Form(...),
    aadhar_number: str = Form(...),
    address: str = Form(...),
    state: Optional[str] = Form(None),
    complaint_type: str = Form(...),
    description: str = Form(...),
    location: str = Form(...),
    station: str = Form("Unassigned"),
    incident_date: str = Form(...),
    aadhar_file: Optional[UploadFile] = File(None),
    supporting_docs: Optional[UploadFile] = File(None),
    session: AsyncSession = Depends(get_async_session),
) -> Complaint:
    await ensure_complaints_table_columns(session)
    complaint_uploads_dir = ROOT_DIR / "complaint_uploads"
    complaint_uploads_dir.mkdir(parents=True, exist_ok=True)
    aadhar_file_path = None
    if aadhar_file and aadhar_file.filename:
        ext = Path(aadhar_file.filename).suffix
        aadhar_file_name = f"{uuid.uuid4().hex}{ext}"
        dest = complaint_uploads_dir / aadhar_file_name
        content = await aadhar_file.read()
        dest.write_bytes(content)
        aadhar_file_path = f"/complaint_uploads/{aadhar_file_name}"
    supporting_docs_path = None
    if supporting_docs and supporting_docs.filename:
        ext = Path(supporting_docs.filename).suffix
        supporting_docs_name = f"{uuid.uuid4().hex}{ext}"
        dest = complaint_uploads_dir / supporting_docs_name
        content = await supporting_docs.read()
        dest.write_bytes(content)
        supporting_docs_path = f"/complaint_uploads/{supporting_docs_name}"
    complaint_orm = ComplaintORM(
        id=str(uuid.uuid4()), user_id="anonymous",
        complainant_name=complainant_name,
        complainant_phone=complainant_phone,
        complainant_email=complainant_email,
        aadhar_number=aadhar_number,
        aadhar_file=aadhar_file_path,
        address=address,
        state=state,
        complaint_type=complaint_type, description=description,
        location=location, station=station,
        incident_date=incident_date, evidence_urls="",
        supporting_docs=supporting_docs_path,
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
    if scope == "srp":
        res = await session.execute(
            text("UPDATE srp SET password = :password WHERE id = :id"),
            {"password": plain_password, "id": entry_id},
        )
        if res.rowcount == 0:
            raise HTTPException(status_code=404, detail="SRP not found")
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
     "GRP stands for Government Railway Police. GRP Andhra Pradesh is responsible for:\n• Maintaining law and order at railway stations\n• Preventing and detecting crimes on trains and stations\n• Protecting passengers and their property\n• Women safety initiatives\n• Emergency response at railway stations"),

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
     "ఫిర్యాదు స్థితి తెలుసుకోవడానికి:\n1. 'ఫిర్యాదు దాఖలు' పేజీలో 'Track Complaint' విభాగానికి వెళ్ళండి\n2. మీ Tracking Number నమోదు చేయండి\n3. ప్రస్తుత స్థితి చూడండి\n\nఫిర్యాదు స్థితి కోసం 139కి కూడా కాల్ చేయవచ్చు."),

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
     "GRP అంటే Government Railway Police (ప్రభుత్వ రైల్వే పోలీస్). GRP ఆంధ్రప్రదేశ్ బాధ్యతలు:\n• రైల్వే స్టేషన్లలో శాంతిభద్రతల నిర్వహణ\n• ప్రయాణికుల భద్రత మరియు ఆస్తి రక్షణ\n• నేరాల నివారణ మరియు నిర్వహణ\n• మహిళా భద్రత కార్యక్రమాలు\n• అత్యవసర స్పందన"),

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
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Chat error: {e}")


# ==================== INCLUDE ROUTER ====================
app.include_router(api_router)
