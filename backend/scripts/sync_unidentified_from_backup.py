import os
import subprocess
import tempfile
from pathlib import Path
from urllib.parse import urlparse

from dotenv import load_dotenv


def _normalize_database_url(raw_url: str) -> str:
    cleaned = (raw_url or "").strip().strip('"').strip("'")
    if cleaned.startswith("postgresql+asyncpg://"):
        cleaned = cleaned.replace("postgresql+asyncpg://", "postgresql://", 1)
    elif cleaned.startswith("postgresql+psycopg://"):
        cleaned = cleaned.replace("postgresql+psycopg://", "postgresql://", 1)
    return cleaned


def _extract_unidentified_copy_block(backup_sql_path: Path) -> str:
    lines = backup_sql_path.read_text(encoding="utf-8", errors="replace").splitlines()
    copy_start = None
    for idx, line in enumerate(lines):
        if line.strip().startswith("COPY public.unidentified_bodies"):
            copy_start = idx
            break

    if copy_start is None:
        raise RuntimeError("Could not find COPY public.unidentified_bodies block in backup SQL")

    copy_lines: list[str] = []
    for raw in lines[copy_start:]:
        copy_lines.append(raw)
        if raw.strip() == r"\.":
            break

    if not copy_lines or copy_lines[-1].strip() != r"\.":
        raise RuntimeError("Invalid COPY block in backup SQL for unidentified_bodies")

    return "\n".join(copy_lines) + "\n"


def _count_copy_rows(copy_block: str) -> int:
    return max(0, len(copy_block.splitlines()) - 2)


def main() -> None:
    backend_dir = Path(__file__).resolve().parents[1]
    load_dotenv(backend_dir / ".env")

    database_url = _normalize_database_url(
        os.getenv("POSTGRES_URL") or os.getenv("DATABASE_URL") or ""
    )
    if not database_url:
        raise RuntimeError("DATABASE_URL/POSTGRES_URL is not set")

    backup_path = backend_dir / "grp_db_backup.sql"
    if not backup_path.exists():
        raise RuntimeError(f"Backup SQL file not found: {backup_path}")

    copy_block = _extract_unidentified_copy_block(backup_path)
    rows_count = _count_copy_rows(copy_block)
    if rows_count <= 0:
        raise RuntimeError("No unidentified_bodies rows found in backup")

    parsed = urlparse(database_url)
    if not parsed.hostname or not parsed.path:
        raise RuntimeError("Invalid DATABASE_URL/POSTGRES_URL")

    db_name = parsed.path.lstrip("/")
    db_user = parsed.username or "postgres"
    db_password = parsed.password or ""
    db_port = str(parsed.port or 5432)

    restore_sql = (
        "SET client_encoding = 'UTF8';\n"
        "BEGIN;\n"
        "TRUNCATE TABLE public.unidentified_bodies;\n"
        f"{copy_block}"
        "COMMIT;\n"
    )

    with tempfile.NamedTemporaryFile("w", encoding="utf-8", suffix=".sql", delete=False) as temp_sql:
        temp_sql.write(restore_sql)
        temp_sql_path = temp_sql.name

    try:
        env = os.environ.copy()
        env["PGPASSWORD"] = db_password
        result = subprocess.run(
            [
                "psql",
                "-h",
                parsed.hostname,
                "-p",
                db_port,
                "-U",
                db_user,
                "-d",
                db_name,
                "-f",
                temp_sql_path,
            ],
            env=env,
            capture_output=True,
            text=True,
            check=False,
        )
        if result.returncode != 0:
            raise RuntimeError(result.stderr.strip() or result.stdout.strip() or "psql restore failed")
    finally:
        try:
            os.remove(temp_sql_path)
        except OSError:
            pass

    print(f"Synced unidentified_bodies successfully. rows_inserted={rows_count}")


if __name__ == "__main__":
    main()
