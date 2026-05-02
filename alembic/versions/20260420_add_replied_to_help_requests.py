"""
Add replied column to help_requests table
"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '20260420_add_replied_to_help_requests'
down_revision = None
branch_labels = None
depends_on = None

def upgrade():
    op.add_column('help_requests', sa.Column('replied', sa.Integer(), nullable=False, server_default='0'))

def downgrade():
    op.drop_column('help_requests', 'replied')