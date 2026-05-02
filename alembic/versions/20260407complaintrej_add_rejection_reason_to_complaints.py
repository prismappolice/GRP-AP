"""add rejection reason to complaints

Revision ID: 20260407complaintrej
Revises: 20260331addrank01
Create Date: 2026-04-07

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '20260407complaintrej'
down_revision: Union[str, Sequence[str], None] = '20260331addrank01'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    column_names = {column['name'] for column in inspector.get_columns('complaints')}
    if 'rejection_reason' not in column_names:
        op.add_column('complaints', sa.Column('rejection_reason', sa.String(), nullable=True))


def downgrade() -> None:
    """Downgrade schema."""
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    column_names = {column['name'] for column in inspector.get_columns('complaints')}
    if 'rejection_reason' in column_names:
        op.drop_column('complaints', 'rejection_reason')