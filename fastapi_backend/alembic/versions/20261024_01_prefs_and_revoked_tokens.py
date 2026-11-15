"""persist user preferences and revoked JWT identifiers

Revision ID: 20261024_01
Revises: 7b9b7e9d4b1a
"""
from alembic import op
import sqlalchemy as sa


revision = "20261024_01"
down_revision = "7b9b7e9d4b1a"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "chatpaat_app_userpreferences",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("theme", sa.String(length=40), nullable=False),
        sa.Column("language", sa.String(length=10), nullable=False),
        sa.Column("notifications_enabled", sa.Boolean(), nullable=False),
        sa.Column("email_on_new_features", sa.Boolean(), nullable=False),
        sa.Column("two_factor_enabled", sa.Boolean(), nullable=False),
        sa.Column("timezone", sa.String(length=50), nullable=False),
        sa.Column("accent_color", sa.String(length=7), nullable=False),
        sa.Column("high_contrast", sa.Boolean(), nullable=False),
        sa.Column("warm_palette", sa.Boolean(), nullable=False),
        sa.Column("font_size", sa.String(length=10), nullable=False),
        sa.Column("message_density", sa.String(length=15), nullable=False),
        sa.Column("auto_scroll", sa.Boolean(), nullable=False),
        sa.Column("sound_enabled", sa.Boolean(), nullable=False),
        sa.Column("compact_sidebar", sa.Boolean(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["chatpaat_app_customuser.id"]),
        sa.UniqueConstraint("user_id"),
    )
    op.create_index(
        "ix_chatpaat_app_userpreferences_user_id",
        "chatpaat_app_userpreferences",
        ["user_id"],
        unique=False,
    )
    op.create_table(
        "chatpaat_app_revokedtoken",
        sa.Column("jti", sa.String(length=36), primary_key=True),
        sa.Column("expires_at", sa.DateTime(), nullable=False),
    )
    op.create_index(
        "ix_chatpaat_app_revokedtoken_expires_at",
        "chatpaat_app_revokedtoken",
        ["expires_at"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(
        "ix_chatpaat_app_revokedtoken_expires_at",
        table_name="chatpaat_app_revokedtoken",
    )
    op.drop_table("chatpaat_app_revokedtoken")
    op.drop_index(
        "ix_chatpaat_app_userpreferences_user_id",
        table_name="chatpaat_app_userpreferences",
    )
    op.drop_table("chatpaat_app_userpreferences")
