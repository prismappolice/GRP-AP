"""create admin table

Revision ID: 20260410admin
Revises: 20260410officertables
Create Date: 2026-04-10 13:30:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '20260410admin'
down_revision: Union[str, Sequence[str], None] = '20260410officertables'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

def upgrade() -> None:
    op.create_table('admin',
        sa.Column('id', sa.String(), primary_key=True),
        sa.Column('email', sa.String(), unique=True, nullable=False),
        sa.Column('name', sa.String(), nullable=False),
        sa.Column('phone', sa.String(), nullable=False),
        sa.Column('password', sa.String(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=True)
    )

def downgrade() -> None:
    op.drop_table('admin')
