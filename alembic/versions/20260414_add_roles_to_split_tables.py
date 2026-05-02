"""add missing role columns to split officer tables

Revision ID: 20260414_add_roles
Revises: 20260412_split_officer
Create Date: 2026-04-14 10:00:00.000000
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = '20260414_add_roles'
down_revision: Union[str, Sequence[str], None] = '20260412_split_officer'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


ROLE_BY_TABLE = {
    'stations': 'station',
    'srp': 'srp',
    'dsrp': 'dsrp',
    'irp': 'irp',
}


def _table_exists(table_name: str) -> bool:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    return table_name in inspector.get_table_names()


def _has_column(table_name: str, column_name: str) -> bool:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    return column_name in {col['name'] for col in inspector.get_columns(table_name)}


def upgrade() -> None:
    for table_name, role_value in ROLE_BY_TABLE.items():
        if not _table_exists(table_name):
            continue

        if not _has_column(table_name, 'role'):
            op.add_column(table_name, sa.Column('role', sa.String(), nullable=True))

        op.execute(
            sa.text(f"UPDATE {table_name} SET role = :role_value WHERE role IS NULL")
            .bindparams(role_value=role_value)
        )

        with op.batch_alter_table(table_name) as batch_op:
            batch_op.alter_column('role', existing_type=sa.String(), nullable=False)


def downgrade() -> None:
    for table_name in ROLE_BY_TABLE:
        if _table_exists(table_name) and _has_column(table_name, 'role'):
            with op.batch_alter_table(table_name) as batch_op:
                batch_op.drop_column('role')
