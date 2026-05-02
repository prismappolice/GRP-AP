"""
Alembic merge migration to resolve multiple heads.
"""
from alembic import op

# revision identifiers, used by Alembic.
revision = '20260408_merge_heads'
down_revision = ('20260407complaintrej', '20260408_add_sirp_userrole')
branch_labels = None
depends_on = None

def upgrade():
    pass

def downgrade():
    pass
