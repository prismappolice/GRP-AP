"""add unidentified_bodies table

Revision ID: 20260412_add_ub_table
Revises: 20260410removetables, 20260410_unify_roles
Create Date: 2026-04-12 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = '20260412_add_ub_table'
down_revision: Union[str, Sequence[str], None] = ('20260410removetables', '20260410_unify_roles')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'unidentified_bodies',
        sa.Column('id', sa.String(), primary_key=True, nullable=False),
        sa.Column('image_url', sa.String(), nullable=False),
        sa.Column('image_file_name', sa.String(), nullable=False),
        sa.Column('station', sa.String(), nullable=False),
        sa.Column('district', sa.String(), nullable=True),
        sa.Column('reported_date', sa.String(), nullable=False),
        sa.Column('description', sa.String(), nullable=False),
        sa.Column('uploaded_by', sa.String(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index('ix_unidentified_bodies_station', 'unidentified_bodies', ['station'])
    op.create_index('ix_unidentified_bodies_created_at', 'unidentified_bodies', ['created_at'])


def downgrade() -> None:
    op.drop_index('ix_unidentified_bodies_created_at', table_name='unidentified_bodies')
    op.drop_index('ix_unidentified_bodies_station', table_name='unidentified_bodies')
    op.drop_table('unidentified_bodies')
