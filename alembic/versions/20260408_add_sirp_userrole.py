"""
Revision ID: 20260408_add_sirp_userrole
Revises: 
Create Date: 2026-04-08

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '20260408_add_sirp_userrole'
down_revision = None
branch_labels = None
depends_on = None

def upgrade():
    # Add 'sirp' to the userrole enum type in PostgreSQL
    op.execute("ALTER TYPE userrole ADD VALUE IF NOT EXISTS 'sirp'")

def downgrade():
    # Downgrade not supported for enum value removal
    pass
