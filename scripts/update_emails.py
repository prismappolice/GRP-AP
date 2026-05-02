"""Update real email addresses for GRP officers and stations.

Updates the `email` column in: stations, srp, dsrp, irp tables.
- Rows without a provided email are left unchanged.
- If the target email already exists in the same table (unique constraint),
  the row is skipped with a CONFLICT warning.
- IRP Renigunta Circle: source had typo "irprurpcgmail.com" → corrected to irprurpc@gmail.com
- IRP Ongole Circle: same email as IRP Nellore Circle → skipped (constraint conflict)

Usage (run from project root):
    python scripts/update_emails.py
"""
import os
import re
from pathlib import Path

import psycopg2
from dotenv import load_dotenv

ROOT_DIR = Path(__file__).resolve().parent.parent
load_dotenv(ROOT_DIR / "backend" / ".env")
load_dotenv(ROOT_DIR / ".env")


def _resolve_db_url() -> str:
    url = (
        os.getenv("DATABASE_URL")
        or os.getenv("POSTGRES_URL")
        or "postgresql://postgres:password@localhost/grp_db"
    )
    return url.replace("postgresql+asyncpg://", "postgresql://", 1)


def _clean_email(raw: str) -> str | None:
    """Lowercase, strip whitespace/spaces, validate has @."""
    if not raw:
        return None
    cleaned = raw.strip().lower().replace(" ", "")
    return cleaned if "@" in cleaned else None


# ─────────────────────────────────────────────────────────────────
# Real emails by table → list of (name_in_db, real_email)
# Entries without an email are intentionally omitted.
# ─────────────────────────────────────────────────────────────────
UPDATES: dict[str, list[tuple[str, str]]] = {
    "stations": [
        ("Vijayawada RPS",       "grpsvza@gmail.com"),
        ("Gudivada RPS",         "gudivadagrps244352@gmail.com"),
        ("Eluru RPS",            "grps.eluru2019@gmail.com"),
        ("Guntur RPS",           "shogrpgnt.grpgnt@gmail.com"),
        ("Narasaraopet RPS",     "grpnrtrps@gmail.com"),
        ("Tenali RPS",           "shotenalirlygrp@gmail.com"),
        ("Nadikudi RPS",         "shogrpnadikudi@gmail.com"),
        ("Rajahmundry RPS",      "rajahmundrygrp@gmail.com"),
        ("Samalkot RPS",         "samalkotrps@gmail.com"),
        ("Tuni RPS",             "grpsituni@gmail.com"),
        ("Bhimavaram RPS",       "bvrmgrps@gmail.com"),
        ("Tadepalligudem RPS",   "railwaypolicetadepalligudem@gmail.com"),
        ("Visakhapatnam RPS",    "shogrpvisakhapatnam@gmail.com"),
        ("Vizianagaram RPS",     "vizianagaramrps@gmail.com"),
        ("Palasa RPS",           "palasagrps@gmail.com"),
        ("Guntakal RPS",         "guntakalrps@gmail.com"),
        ("Gooty RPS",            "gootyrps@gmail.com"),
        ("Adoni RPS",            "sho_adn_grpgtl@appolice.gov.in"),
        ("Kurnool RPS",          "shokurnoolrps@gmail.com"),
        ("Nandyal RPS",          "sho.nandyalrps123@gmail.com"),
        ("Dharmavaram RPS",      "sho_dmm@grpgtl.appolice.gov.in"),
        ("Anantapuramu RPS",     "sho_atp@grpgtl.appolice.gov.in"),
        ("Kadiri RPS",           "sho_kdr_grpgtl@appolice.gov.in"),
        ("Hindupuramu RPS",      "hindupurgrp21@gmail.com"),
        ("Tirupati RPS",         "shotptygtl123@gmail.com"),
        ("Renigunta RPS",        "reniguntarpsru@gmail.com"),
        ("Chittoor RPS",         "chiittoorgrp@gmail.com"),
        ("Kadapa RPS",           "sho.kadaparps@gmail.com"),
        ("Yerraguntla RPS",      "sho.yerraguntlarps@gmail.com"),
        ("Nellore RPS",          "nlrgrpgtl@gmail.com"),
        # Gudur RPS: no email provided — skipped
        ("Kavali RPS",           "kavalirps@gmail.com"),
        ("Ongole RPS",           "ongolerps647@gmail.com"),
        ("Chirala RPS",          "chiralagrp@gmail.com"),
    ],
    "srp": [
        ("SRP Vijayawada",  "sprlyvza@gmail.com"),
        # SRP Guntakal: no email provided — skipped
    ],
    "dsrp": [
        ("DSRP Vijayawada",    "dsrp.vja@gmail.com"),
        ("DSRP Guntur",        "gntdsrpgrpvza@gmail.com"),   # source: "gntdsrpgrpvza@gmail. Com" (cleaned)
        ("DSRP Rajahmundry",   "dsrpofficerjy@gmail.com"),
        ("DSRP Visakhapatnam", "dsrp.vskp@gmail.com"),
        ("DSRP Guntakal",      "dsrpgtl@gmail.com"),
        ("DSRP Tirupati",      "dsprailwaystirupatigrpap@gmail.com"),
        ("DSRP Nellore",       "dsrpnellore9@gmail.com"),
    ],
    "irp": [
        ("IRP Guntakal Circle",      "irpgtlrpcircle@gmail.com"),
        ("IRP Kurnool Circle",       "iprkurnool@gmail.com"),
        ("IRP Dharmavaram Circle",   "shokurnoolrps@gmail.com"),
        ("IRP Tirupati Circle",      "shotptygtl123@gmail.com"),
        ("IRP Renigunta Circle",     "irprurpc@gmail.com"),          # source typo "irprurpcgmail.com" → corrected
        ("IRP Kadapa Circle",        "irp_kdp_grpgtl@appolice.gov.in"),
        ("IRP Nellore Circle",       "ongolerpcircle.123@gmail.com"),
        ("IRP Ongole Circle",        "ongolerpcircle.123@gmail.com"), # same as Nellore Circle — will conflict, auto-skipped
        ("IRP Vijayawada",           "grpsvza@gmail.com"),
        ("IRP Vijayawada Circle",    "vijayawadalines@gmail.com"),
        ("IRP Guntur",               "shogrpgnt.grpgnt@gmail.com"),
        ("IRP Guntur Circle",        "irplinesguntur@gmail.com"),
        ("IRP Rajahmundry",          "rajahmundrygrp@gmail.com"),
        ("IRP Kakinada Circle",      "kakinadairplines@gmail.com"),
        ("IRP Bhimavaram Circle",    "irpbvrmlinecircle@gmail.com"),
        ("IRP Visakhapatnam",        "shogrpvisakhapatnam@gmail.com"),
        ("IRP Visakhapatnam Circle", "irplinesvskp@gmail.com"),
    ],
}


def run_updates(cur) -> tuple[int, int]:
    updated = skipped = 0
    for table, entries in UPDATES.items():
        print(f"\n=== {table.upper()} ===")
        for name, raw_email in entries:
            email = _clean_email(raw_email)
            if not email:
                print(f"  SKIP  [{table}] {name}: invalid email '{raw_email}'")
                skipped += 1
                continue

            cur.execute(f"SELECT id, email FROM {table} WHERE name = %s", (name,))
            row = cur.fetchone()
            if not row:
                print(f"  MISS  [{table}] {name}: not found in DB")
                skipped += 1
                continue

            row_id, current_email = row
            if current_email == email:
                print(f"  SAME  [{table}] {name}: already set to {email}")
                skipped += 1
                continue

            # Check unique constraint: ensure target email isn't already used by another row
            cur.execute(
                f"SELECT id FROM {table} WHERE email = %s AND id <> %s",
                (email, row_id),
            )
            if cur.fetchone():
                print(f"  CONF  [{table}] {name}: '{email}' already used by another row — skipped")
                skipped += 1
                continue

            cur.execute(
                f"UPDATE {table} SET email = %s WHERE id = %s",
                (email, row_id),
            )
            print(f"  UPD   [{table}] {name}: {current_email} → {email}")
            updated += 1

    return updated, skipped


def main() -> None:
    conn = psycopg2.connect(_resolve_db_url())
    cur = conn.cursor()
    try:
        updated, skipped = run_updates(cur)
        conn.commit()
        print(f"\nDone. Updated: {updated}  Skipped/unchanged: {skipped}")
    except Exception:
        conn.rollback()
        raise
    finally:
        cur.close()
        conn.close()


if __name__ == "__main__":
    main()
