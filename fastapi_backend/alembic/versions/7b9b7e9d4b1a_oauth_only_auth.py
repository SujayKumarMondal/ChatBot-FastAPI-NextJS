"""add OAuth identity fields for provider-only authentication

Revision ID: 7b9b7e9d4b1a
Revises: 305d859b115e
"""
from alembic import op
import sqlalchemy as sa


revision = "7b9b7e9d4b1a"
down_revision = "305d859b115e"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("chatpaat_app_customuser", sa.Column("oauth_provider", sa.String(length=20), nullable=True))
    op.add_column("chatpaat_app_customuser", sa.Column("oauth_subject", sa.String(length=255), nullable=True))
    op.alter_column("chatpaat_app_customuser", "password", existing_type=sa.String(length=128), nullable=True)
    op.create_unique_constraint(
        "uq_customuser_oauth_identity",
        "chatpaat_app_customuser",
        ["oauth_provider", "oauth_subject"],
    )


def downgrade() -> None:
    op.drop_constraint("uq_customuser_oauth_identity", "chatpaat_app_customuser", type_="unique")
    op.alter_column("chatpaat_app_customuser", "password", existing_type=sa.String(length=128), nullable=False)
    op.drop_column("chatpaat_app_customuser", "oauth_subject")
    op.drop_column("chatpaat_app_customuser", "oauth_provider")