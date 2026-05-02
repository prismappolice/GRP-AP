"""drop disposition column from unidentified_bodies if it exists

Revision ID: 20260420_drop_disposition
Revises: 20260414_add_roles
Create Date: 2026-04-20 00:00:00.000000
"""

from typing import Sequence, Union

from alembic import op
from sqlalchemy import text

revision: str = '20260420_drop_disposition'
down_revision: Union[str, Sequence[str], None] = '20260414_add_roles'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute(text(
        "ALTER TABLE unidentified_bodies DROP COLUMN IF EXISTS disposition"
    ))


def downgrade() -> None:
    pass
