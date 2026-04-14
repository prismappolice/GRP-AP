"""split officer table back into separate stations, srp, dsrp, irp tables

Revision ID: 20260412_split_officer
Revises: 20260412_add_ub_table
Create Date: 2026-04-12 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = '20260412_split_officer'
down_revision: Union[str, Sequence[str], None] = '20260412_add_ub_table'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.drop_table('officer')

    op.create_table('stations',
        sa.Column('id', sa.String(), primary_key=True, nullable=False),
        sa.Column('email', sa.String(), unique=True, nullable=False),
        sa.Column('name', sa.String(), nullable=False),
        sa.Column('phone', sa.String(), nullable=False),
        sa.Column('password', sa.String(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=True),
    )
    op.create_table('srp',
        sa.Column('id', sa.String(), primary_key=True, nullable=False),
        sa.Column('email', sa.String(), unique=True, nullable=False),
        sa.Column('name', sa.String(), nullable=False),
        sa.Column('phone', sa.String(), nullable=False),
        sa.Column('password', sa.String(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=True),
    )
    op.create_table('dsrp',
        sa.Column('id', sa.String(), primary_key=True, nullable=False),
        sa.Column('email', sa.String(), unique=True, nullable=False),
        sa.Column('name', sa.String(), nullable=False),
        sa.Column('phone', sa.String(), nullable=False),
        sa.Column('password', sa.String(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=True),
    )
    op.create_table('irp',
        sa.Column('id', sa.String(), primary_key=True, nullable=False),
        sa.Column('email', sa.String(), unique=True, nullable=False),
        sa.Column('name', sa.String(), nullable=False),
        sa.Column('phone', sa.String(), nullable=False),
        sa.Column('password', sa.String(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=True),
    )


def downgrade() -> None:
    op.drop_table('irp')
    op.drop_table('dsrp')
    op.drop_table('srp')
    op.drop_table('stations')
    op.create_table('officer',
        sa.Column('id', sa.String(), primary_key=True, nullable=False),
        sa.Column('email', sa.String(), unique=True, nullable=False),
        sa.Column('name', sa.String(), nullable=False),
        sa.Column('phone', sa.String(), nullable=False),
        sa.Column('password', sa.String(), nullable=False),
        sa.Column('role', sa.String(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=True),
    )
