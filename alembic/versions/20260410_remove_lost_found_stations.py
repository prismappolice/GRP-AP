"""remove lost_items, found_items, stations tables

Revision ID: 20260410removetables
Revises: 20260410admin
Create Date: 2026-04-10 15:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = '20260410removetables'
down_revision: Union[str, Sequence[str], None] = '20260410admin'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

def upgrade() -> None:
    op.drop_table('lost_items')
    op.drop_table('found_items')
    op.drop_table('stations')

def downgrade() -> None:
    pass
