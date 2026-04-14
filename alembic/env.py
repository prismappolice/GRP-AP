from logging.config import fileConfig
from pathlib import Path
import os

from sqlalchemy import engine_from_config
from sqlalchemy import pool

from alembic import context
from dotenv import load_dotenv

# this is the Alembic Config object, which provides
# access to the values within the .ini file in use.
config = context.config

# Interpret the config file for Python logging.
# This line sets up loggers basically.
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# add your model's MetaData object here
# for 'autogenerate' support
# Import Base from backend.server for autogenerate
import sys
ROOT_DIR = Path(__file__).resolve().parents[1]
load_dotenv(ROOT_DIR / "backend" / ".env")
load_dotenv(ROOT_DIR / ".env")

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'backend')))
from server import Base

def _resolve_db_url() -> str:
    url = (
        os.getenv("DATABASE_URL")
        or os.getenv("POSTGRES_URL")
        or config.get_main_option("sqlalchemy.url")
    )
    if url and url.startswith('"') and url.endswith('"'):
        url = url[1:-1]
    if url and url.startswith("postgresql+asyncpg://"):
        url = url.replace("postgresql+asyncpg://", "postgresql+psycopg2://", 1)
    return url

resolved_db_url = _resolve_db_url()
if resolved_db_url:
    config.set_main_option("sqlalchemy.url", resolved_db_url)

target_metadata = Base.metadata

# other values from the config, defined by the needs of env.py,
# can be acquired:
# my_important_option = config.get_main_option("my_important_option")
# ... etc.


def run_migrations_offline() -> None:
    """Run migrations in 'offline' mode.

    This configures the context with just a URL
    and not an Engine, though an Engine is acceptable
    here as well.  By skipping the Engine creation
    we don't even need a DBAPI to be available.

    Calls to context.execute() here emit the given string to the
    script output.

    """
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """Run migrations in 'online' mode.

    In this scenario we need to create an Engine
    and associate a connection with the context.

    """
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        context.configure(
            connection=connection, target_metadata=target_metadata
        )

        with context.begin_transaction():
            context.run_migrations()

    # Auto-seed credential tables after every migration
    _run_seed()


def _run_seed() -> None:
    """Run seed_all.py after migrations to ensure credential tables are populated."""
    import subprocess
    import sys

    seed_script = os.path.abspath(
        os.path.join(os.path.dirname(__file__), '..', 'seed_all.py')
    )
    if os.path.exists(seed_script):
        print("\n[alembic] Running seed_all.py to restore any missing credentials...")
        result = subprocess.run(
            [sys.executable, seed_script],
            capture_output=True,
            text=True,
        )
        if result.stdout:
            print(result.stdout)
        if result.returncode != 0 and result.stderr:
            print(f"[alembic] seed_all warning: {result.stderr}")
    else:
        print(f"[alembic] seed_all.py not found at {seed_script}, skipping.")


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
