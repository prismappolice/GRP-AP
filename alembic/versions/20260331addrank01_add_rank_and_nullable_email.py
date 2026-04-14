"""
Add rank column and make email nullable in stations table
"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '20260331addrank01'
down_revision = '1754b951448d'
branch_labels = None
depends_on = None

def upgrade():
	op.add_column('stations', sa.Column('rank', sa.String(), nullable=True))
	op.alter_column('stations', 'email', existing_type=sa.String(), nullable=True)

def downgrade():
	op.drop_column('stations', 'rank')
	op.alter_column('stations', 'email', existing_type=sa.String(), nullable=False)
