"""
Seed all credential tables: admin, dgp, srp, dsrp, irp, stations.
- Existing records (matched by email) are SKIPPED.
- Missing records are INSERTED.
- Safe to run multiple times.

Usage:
    python seed_all.py
"""
import re
import uuid
import datetime
import psycopg2
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

DB_URL = "postgresql://postgres:password@localhost/grp_db"


def _hash(plain: str) -> str:
    return pwd_context.hash(plain)


def _id() -> str:
    return str(uuid.uuid4())


def _now():
    return datetime.datetime.now(datetime.timezone.utc)


def _insert_if_missing(cur, table: str, records: list[dict], id_field: str = "email"):
    """Insert records not already present (matched by id_field)."""
    cur.execute(f"SELECT {id_field} FROM {table}")
    existing = {row[0] for row in cur.fetchall()}
    inserted = skipped = 0
    for r in records:
        key = r[id_field]
        if key in existing:
            print(f"  SKIP  [{table}]: {r.get('name', key)}")
            skipped += 1
        else:
            cols = ", ".join(r.keys())
            placeholders = ", ".join(["%s"] * len(r))
            cur.execute(
                f"INSERT INTO {table} ({cols}) VALUES ({placeholders})",
                list(r.values()),
            )
            existing.add(key)
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
    ("IRP Vizianagaram Circle", "9247585738", "irp.vizianagaram@grp.local"),
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
        "created_at": _now(),
    }
    for name, phone in _STATIONS_RAW
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
    i, s = _insert_if_missing(cur, "dgp", DGP_RECORDS)
    total_inserted += i

    print("\n=== SRP ===")
    i, s = _insert_if_missing(cur, "srp", SRP_RECORDS)
    total_inserted += i

    print("\n=== DSRP ===")
    i, s = _insert_if_missing(cur, "dsrp", DSRP_RECORDS)
    total_inserted += i

    print("\n=== IRP ===")
    i, s = _insert_if_missing(cur, "irp", IRP_RECORDS)
    total_inserted += i

    print("\n=== STATIONS ===")
    i, s = _insert_if_missing(cur, "stations", STATION_RECORDS)
    total_inserted += i

    conn.commit()
    cur.close()
    conn.close()
    print(f"\nDone. Total inserted: {total_inserted}")


if __name__ == "__main__":
    main()
