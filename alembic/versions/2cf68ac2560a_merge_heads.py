"""merge heads

Revision ID: 2cf68ac2560a
Revises: 20260420_add_replied_to_help_requests, 20260420_drop_disposition
Create Date: 2026-04-20 16:43:21.447297

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '2cf68ac2560a'
down_revision: Union[str, Sequence[str], None] = ('20260420_add_replied_to_help_requests', '20260420_drop_disposition')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
