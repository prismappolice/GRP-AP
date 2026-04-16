"""
Seed the required GRP data tables for deployment.
Includes admin, officer, station, public user, complaint, and unidentified body data.
- Existing records are skipped.
- Missing records are inserted.
- Safe to run multiple times.

Usage:
    python seed_all.py
"""
import json
import os
import re
import uuid
import datetime
from pathlib import Path

import psycopg2
from dotenv import load_dotenv
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

ROOT_DIR = Path(__file__).resolve().parent
load_dotenv(ROOT_DIR / "backend" / ".env")
load_dotenv(ROOT_DIR / ".env")


def _resolve_db_url() -> str:
    url = (
        os.getenv("DATABASE_URL")
        or os.getenv("POSTGRES_URL")
        or "postgresql://postgres:password@localhost/grp_db"
    )
    return url.replace("postgresql+asyncpg://", "postgresql://", 1)


DB_URL = _resolve_db_url()


def _hash(plain: str) -> str:
    return pwd_context.hash(plain)


def _id() -> str:
    return str(uuid.uuid4())


def _now():
    return datetime.datetime.now(datetime.timezone.utc)


def _parse_media_field(value):
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


def _encode_media_field(items):
    cleaned = [str(item).strip() for item in items if str(item).strip()]
    if not cleaned:
        return ""
    return json.dumps(cleaned) if len(cleaned) > 1 else cleaned[0]


def _merge_unidentified_body_duplicates(cur):
    cur.execute(
        """
        SELECT id, station, reported_date, description, image_url, image_file_name
        FROM unidentified_bodies
        ORDER BY created_at ASC NULLS LAST, id ASC
        """
    )
    rows = cur.fetchall()
    grouped = {}
    removed = 0

    for row_id, station, reported_date, description, image_url, image_file_name in rows:
        key = (station, reported_date, (description or "").strip())
        urls = _parse_media_field(image_url)
        files = _parse_media_field(image_file_name)

        if key not in grouped:
            grouped[key] = {"keep_id": row_id, "urls": urls[:], "files": files[:]}
            continue

        grouped[key]["urls"].extend(urls)
        grouped[key]["files"].extend(files)
        cur.execute("DELETE FROM unidentified_bodies WHERE id = %s", (row_id,))
        removed += 1

    for data in grouped.values():
        cur.execute(
            "UPDATE unidentified_bodies SET image_url = %s, image_file_name = %s WHERE id = %s",
            (
                _encode_media_field(data["urls"]),
                _encode_media_field(data["files"]),
                data["keep_id"],
            ),
        )

    return removed


def _cleanup_canonical_named_records(
    cur,
    table: str,
    records: list[dict],
    name_field: str = "name",
    canonical_field: str = "email",
):
    removed = 0
    for record in records:
        name = record.get(name_field)
        canonical_value = record.get(canonical_field)
        if not name or canonical_value is None:
            continue
        cur.execute(
            f"DELETE FROM {table} WHERE {name_field} = %s AND {canonical_field} <> %s",
            (name, canonical_value),
        )
        removed += cur.rowcount or 0
    return removed


def _insert_if_missing(
    cur,
    table: str,
    records: list[dict],
    id_field: str = "email",
    alt_fields: list[str] | None = None,
):
    """Insert records not already present (matched by id_field or alt_fields)."""
    match_fields = [id_field, *(alt_fields or [])]
    existing_by_field: dict[str, set] = {}

    for field in match_fields:
        cur.execute(f"SELECT {field} FROM {table} WHERE {field} IS NOT NULL")
        existing_by_field[field] = {row[0] for row in cur.fetchall()}

    inserted = skipped = 0
    for r in records:
        matched = False
        for field in match_fields:
            value = r.get(field)
            if value is not None and value in existing_by_field[field]:
                matched = True
                break

        key = r.get(id_field) or r.get("name") or r.get("id")
        if matched:
            print(f"  SKIP  [{table}]: {r.get('name', key)}")
            skipped += 1
        else:
            cols = ", ".join(r.keys())
            placeholders = ", ".join(["%s"] * len(r))
            cur.execute(
                f"INSERT INTO {table} ({cols}) VALUES ({placeholders})",
                list(r.values()),
            )
            for field in match_fields:
                value = r.get(field)
                if value is not None:
                    existing_by_field[field].add(value)
            print(f"  INSERT [{table}]: {r.get('name', key)}")
            inserted += 1
    return inserted, skipped


# ─────────────────────────────────────────────
# ADMIN
# ─────────────────────────────────────────────
ADMIN_RECORDS = [
    {
        "id": _id(),
        "email": "admin@grp.local",
        "name": "Admin User",
        "phone": "9000000100",
        "password": _hash("Admin@2026"),
        "created_at": _now(),
    },
]

# ─────────────────────────────────────────────
# DGP  (role column required)
# ─────────────────────────────────────────────
_DGP_RAW = [
    ("DGP AP",        "9000000000", "dgpap@grp.local",          "dgp",  "DGP@2026"),
    ("ADGP Railways", "9000000000", "apadgprailways@grp.local",  "adgp", "Adgp@2026"),
    ("DIG Railways",  "9000000000", "digrailways@grp.local",     "dig",  "Dig@2026"),
]
DGP_RECORDS = [
    {
        "id": _id(),
        "email": email,
        "name": name,
        "phone": phone,
        "password": _hash(pw),
        "role": role,
        "created_at": _now(),
    }
    for name, phone, email, role, pw in _DGP_RAW
]

# ─────────────────────────────────────────────
# SRP
# ─────────────────────────────────────────────
_SRP_RAW = [
    ("SRP Vijayawada", "9247585800", "srp.vijayawada@grp.local"),
    ("SRP Guntakal",   "9247575601", "srp.guntakal@grp.local"),
]
SRP_RECORDS = [
    {
        "id": _id(),
        "email": email,
        "name": name,
        "phone": phone,
        "password": _hash(f"#Srp@{name.replace('SRP ', '')}$"),
        "role": "srp",
        "created_at": _now(),
    }
    for name, phone, email in _SRP_RAW
]

# ─────────────────────────────────────────────
# DSRP
# ─────────────────────────────────────────────
_DSRP_RAW = [
    ("DSRP Vijayawada",    "9247585709", "dsrp.vijayawada@grp.local"),
    ("DSRP Guntur",        "9247585715", "dsrp.guntur@grp.local"),
    ("DSRP Rajahmundry",   "9247585725", "dsrp.rajahmundry@grp.local"),
    ("DSRP Visakhapatnam", "9247585736", "dsrp.visakhapatnam@grp.local"),
    ("DSRP Guntakal",      "9247575603", "dsrp.guntakal@grp.local"),
    ("DSRP Tirupati",      "9247575617", "dsrp.tirupati@grp.local"),
    ("DSRP Nellore",       "9247575626", "dsrp.nellore@grp.local"),
]
DSRP_RECORDS = [
    {
        "id": _id(),
        "email": email,
        "name": name,
        "phone": phone,
        "password": _hash(f"#Dsrp@{name.replace('DSRP ', '')}$"),
        "role": "dsrp",
        "created_at": _now(),
    }
    for name, phone, email in _DSRP_RAW
]

# ─────────────────────────────────────────────
# IRP
# ─────────────────────────────────────────────
_IRP_RAW = [
    ("IRP Vijayawada",          "9247585710", "irp.vijayawada@grp.local"),
    ("IRP Vijayawada Circle",   "9247585711", "irp.vijayawadacircle@grp.local"),
    ("IRP Guntur",              "9247585716", "irp.guntur@grp.local"),
    ("IRP Guntur Circle",       "9247585717", "irp.gunturchircle@grp.local"),
    ("IRP Rajahmundry",         "9247585726", "irp.rajahmundry@grp.local"),
    ("IRP Kakinada Circle",     "9247585727", "irp.kakinada@grp.local"),
    ("IRP Bhimavaram Circle",   "9247585728", "irp.bhimavaram@grp.local"),
    ("IRP Visakhapatnam",       "9247585737", "irp.visakhapatnam@grp.local"),
    ("IRP Visakhapatnam Circle", "9247585738", "irp.visakhapatnam.circle@grp.local"),
    ("IRP Guntakal Circle",     "9247575604", "irp.guntakal@grp.local"),
    ("IRP Kurnool Circle",      "9247575608", "irp.kurnool@grp.local"),
    ("IRP Dharmavaram Circle",  "9247575612", "irp.dharmavaram@grp.local"),
    ("IRP Tirupati Circle",     "9247575618", "irp.tirupati@grp.local"),
    ("IRP Renigunta Circle",    "9247575620", "irp.renigunta@grp.local"),
    ("IRP Kadapa Circle",       "9247575623", "irp.kadapa@grp.local"),
    ("IRP Nellore Circle",      "9247575627", "irp.nellore@grp.local"),
    ("IRP Ongole Circle",       "9247575631", "irp.ongole@grp.local"),
]
IRP_RECORDS = [
    {
        "id": _id(),
        "email": email,
        "name": name,
        "phone": phone,
        "password": _hash(f"#Irp@{name.replace('IRP ', '').replace(' ', '')}$"),
        "role": "irp",
        "created_at": _now(),
    }
    for name, phone, email in _IRP_RAW
]

# ─────────────────────────────────────────────
# STATIONS  (63 plain names from stations.js)
# ─────────────────────────────────────────────
_STATIONS_RAW = [
    ("Vijayawada RPS",           "9247585712"),
    ("Gudivada RPS",             "9247585713"),
    ("Machilipatnam RPOP",       "9247585714"),
    ("Eluru RPS",                "9247585769"),
    ("Guntur RPS",               "9247585716"),
    ("Narasaraopet RPS",         "9247585720"),
    ("Tenali RPS",               "9247585721"),
    ("Bapatla RPOP",             "9247585722"),
    ("Nadikudi RPS",             "9247585723"),
    ("Repalle RPOP",             "9247585724"),
    ("Rajahmundry RPS",          "9247585726"),
    ("Godavari RPOP",            "9247585734"),
    ("Samalkot RPS",             "9247585729"),
    ("Kakinada RPOP",            "9247585730"),
    ("Tuni RPS",                 "9247585731"),
    ("Annavaram RPOP",           "9247585734"),
    ("Bhimavaram RPS",           "9247585732"),
    ("Narsapur RPOP",            "9247585732"),
    ("Tadepalligudem RPS",       "9247585733"),
    ("Nidavole RPOP",            "9247585735"),
    ("Tanuku RPOP",              "9247585733"),
    ("Visakhapatnam RPS",        "9247585739"),
    ("Duvvada RPOP",             "9247585741"),
    ("Vizianagaram RPS",         "9247585742"),
    ("Parvathipuram RPOP",       "9247585746"),
    ("Bobbili RPOP",             "9247585745"),
    ("Palasa RPS",               "9247585743"),
    ("Srikakulam RPOP",          "9247585744"),
    ("Guntakal RPS",             "9247575605"),
    ("Gooty RPS",                "9247575606"),
    ("Tadipatri RPOP",           "9247575647"),
    ("Adoni RPS",                "9247575607"),
    ("Rayadurgam RPOP",          "9247575614"),
    ("Mantralayam RPOP",         "9247575640"),
    ("Kurnool RPS",              "9247575609"),
    ("Dhone RPOP",               "9247575610"),
    ("Nandyal RPS",              "9247575611"),
    ("Markapuram RPOP",          "9247575643"),
    ("Dharmavaram RPS",          "9247575614"),
    ("Anantapuramu RPS",         "9247575613"),
    ("Hindupuramu RPS",          "9247575615"),
    ("SSSPN RS RPOP",            "9247575644"),
    ("Kadiri RPS",               "9247575616"),
    ("Puttaparthi RPOP",         "9247575644"),
    ("Tirupati RPS",             "9247575619"),
    ("Renigunta RPS",            "9247575621"),
    ("Chittoor RPS",             "9247575622"),
    ("Puttur RPOP",              "9247585724"),
    ("Srikalahasti RPOP",        "9247575649"),
    ("Pakala RPOP",              "9247575650"),
    ("Kuppam RPOP",              "9247575642"),
    ("Kadapa RPS",               "9247575624"),
    ("Yerraguntla RPS",          "9247575625"),
    ("Nandalur RPOP",            "9247585724"),
    ("Nellore RPS",              "9247575628"),
    ("Gudur RPS",                "9247575629"),
    ("Sullurupeta RPOP",         "9247575648"),
    ("Kavali RPS",               "9247575630"),
    ("Krishnapatnam Port RPOP",  "9247575628"),
    ("Bitragunta RPOP",          "9247575628"),
    ("Ongole RPS",               "9247575632"),
    ("Chirala RPS",              "9247575633"),
    ("Singarayakonda RPOP",      "9247575632"),
]

STOPWORDS = {"rps", "rpop", "rs", "port"}


def _delete_rpop_station_credentials(cur) -> int:
    cur.execute("DELETE FROM stations WHERE UPPER(name) LIKE '%RPOP%'")
    return cur.rowcount or 0


def _station_email(name: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", ".", name.lower().strip()).strip(".")
    return f"{slug}@grp.local"

def _station_pw(name: str) -> str:
    cleaned = re.sub(r"[^A-Za-z0-9]", "", name.lower())
    return f"#{cleaned[:1].upper()}{cleaned[1:]}@2026"

STATION_RECORDS = [
    {
        "id": _id(),
        "email": _station_email(name),
        "name": name,
        "phone": phone,
        "password": _hash(_station_pw(name)),
        "role": "station",
        "created_at": _now(),
    }
    for name, phone in _STATIONS_RAW
    if "RPOP" not in name.upper()
]

PUBLIC_USER_RECORDS = [
    {
        "id": "05c27f84-4ad9-4733-9a56-3eb6b17037d1",
        "email": "battiniraju29@gmail.com",
        "name": "Battini Raju",
        "phone": "9553655688",
        "role": "public",
        "created_at": datetime.datetime(2026, 4, 13, 6, 57, 2, 514537, tzinfo=datetime.timezone.utc),
        "password": "$2b$12$eQSw2k46KV582l3EdqQKk.EGknFpeSMvM9aN8Dn8grjkKN7CA.n.O",
    },
]

COMPLAINT_RECORDS = [
    {
        "id": "bba2b246-db00-44a2-ab66-0179af293c15",
        "user_id": "ee492f9a-b9e6-4c09-a243-3dea364d3646",
        "complaint_type": "harassment",
        "description": "Hi Sir, I am bindhu from Hyderbad , i am traveeling from hyderabad to ongole but i have harressed by some gand at Guntur railway station during train stoped at coach no d3....they misbehaved with me rudely please take necessary action im sending the video potage of the incident. My contact number is 9797979797",
        "location": "Platfrom 2, Pole No 23, Guntur Railwaystation..",
        "station": "Guntur RPS",
        "incident_date": "2026-04-02",
        "evidence_urls": "",
        "status": "pending",
        "tracking_number": "GRP21C30A52",
        "created_at": datetime.datetime(2026, 4, 2, 9, 41, 54, 161651, tzinfo=datetime.timezone.utc),
        "updated_at": datetime.datetime(2026, 4, 2, 9, 41, 54, 161655, tzinfo=datetime.timezone.utc),
        "rejection_reason": None,
    },
]

UNIDENTIFIED_BODY_RECORDS = [
    {
        "id": "8f8b3af7-41ef-44e1-a638-fbae07a2310d",
        "image_url": "/unidentified_uploads/29fc58227ca047689b450fa411767311.png",
        "image_file_name": "29fc58227ca047689b450fa411767311.png",
        "station": "Adoni RPS",
        "district": None,
        "reported_date": "2026-04-13",
        "description": "ghjkasbdijabJHKCKJabjcxbkANMNASMNXB JNASBXJABJHBAsJHBJASBX",
        "uploaded_by": "Adoni RPS",
        "created_at": datetime.datetime(2026, 4, 13, 11, 7, 19, 736883, tzinfo=datetime.timezone.utc),
    },
    {
        "id": "59ba000b-c6dc-4b57-867e-0b065b0179f0",
        "image_url": json.dumps([
            "/unidentified_uploads/c09fcdc3c8244a46a7cc5a317790477f.jpg",
            "/unidentified_uploads/d3a8b6526b134b2d91409b3992e08a88.jpg",
        ]),
        "image_file_name": json.dumps([
            "c09fcdc3c8244a46a7cc5a317790477f.jpg",
            "d3a8b6526b134b2d91409b3992e08a88.jpg",
        ]),
        "station": "Adoni RPS",
        "district": None,
        "reported_date": "2026-04-13",
        "description": "hkvjhfvuyktcdykttykyhtfvyhtgut",
        "uploaded_by": "Adoni RPS",
        "created_at": datetime.datetime(2026, 4, 13, 12, 59, 28, 664427, tzinfo=datetime.timezone.utc),
    },
]


# ─────────────────────────────────────────────
# MAIN
# ─────────────────────────────────────────────
def main():
    conn = psycopg2.connect(DB_URL)
    cur = conn.cursor()

    total_inserted = 0

    print("\n=== ADMIN ===")
    i, s = _insert_if_missing(cur, "admin", ADMIN_RECORDS)
    total_inserted += i

    print("\n=== DGP ===")
    removed = _cleanup_canonical_named_records(cur, "dgp", DGP_RECORDS)
    if removed:
        print(f"  CLEAN  [dgp]: removed {removed} duplicate/legacy row(s)")
    i, s = _insert_if_missing(cur, "dgp", DGP_RECORDS, alt_fields=["name"])
    total_inserted += i

    print("\n=== SRP ===")
    i, s = _insert_if_missing(cur, "srp", SRP_RECORDS, alt_fields=["name"])
    total_inserted += i

    print("\n=== DSRP ===")
    i, s = _insert_if_missing(cur, "dsrp", DSRP_RECORDS, alt_fields=["name"])
    total_inserted += i

    print("\n=== IRP ===")
    i, s = _insert_if_missing(cur, "irp", IRP_RECORDS, alt_fields=["name"])
    total_inserted += i

    print("\n=== STATIONS ===")
    deleted = _delete_rpop_station_credentials(cur)
    if deleted:
        print(f"  DELETE [stations]: removed {deleted} RPOP station logins")
    i, s = _insert_if_missing(cur, "stations", STATION_RECORDS, alt_fields=["name"])
    total_inserted += i

    print("\n=== PUBLIC USERS ===")
    i, s = _insert_if_missing(cur, "public_users", PUBLIC_USER_RECORDS)
    total_inserted += i

    print("\n=== COMPLAINTS ===")
    i, s = _insert_if_missing(cur, "complaints", COMPLAINT_RECORDS, id_field="id", alt_fields=["tracking_number"])
    total_inserted += i

    print("\n=== UNIDENTIFIED BODIES ===")
    merged = _merge_unidentified_body_duplicates(cur)
    if merged:
        print(f"  CLEAN  [unidentified_bodies]: merged {merged} duplicate media row(s)")
    i, s = _insert_if_missing(cur, "unidentified_bodies", UNIDENTIFIED_BODY_RECORDS, id_field="id", alt_fields=["image_file_name"])
    total_inserted += i

    conn.commit()
    cur.close()
    conn.close()
    print(f"\nDone. Total inserted: {total_inserted}")


if __name__ == "__main__":
    main()
