import os
from logging.config import fileConfig
from sqlalchemy import engine_from_config, pool
from alembic import context
from dotenv import load_dotenv
from urllib.parse import quote

# Load env
load_dotenv()

# Alembic config
config = context.config

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# =========================
# Import your models
# =========================
from models import Base  # ⚠️ adjust if needed
# IMPORTANT: ensure models are imported
import models

target_metadata = Base.metadata

# =========================
# ENV variables
# =========================
USE_POSTGRES = os.getenv("USE_POSTGRES", "").lower() == "true"
DATABASE_URL = os.getenv("DATABASE_URL", "")

DB_NAME = os.getenv("DB_NAME", "")
DB_USER = os.getenv("DB_USER", "")
DB_PASSWORD = os.getenv("DB_PASSWORD", "")
DB_HOST = os.getenv("DB_HOST", "localhost")
DB_PORT = os.getenv("DB_PORT", "5432")
DB_SCHEMA = os.getenv("DB_SCHEMA", "public")

encoded_password = quote(DB_PASSWORD, safe="")

# =========================
# Database URL
# =========================
if DATABASE_URL:
    DATABASE_URL = DATABASE_URL
elif USE_POSTGRES and DB_NAME:
    DATABASE_URL = (
        f"postgresql://{DB_USER}:{encoded_password}@{DB_HOST}:{DB_PORT}/{DB_NAME}"
    )
else:
    DATABASE_URL = "sqlite:///./db.sqlite3"


# =========================
# Offline migrations
# =========================
def run_migrations_offline():
    context.configure(
        url=DATABASE_URL,
        target_metadata=target_metadata,
        literal_binds=True,
    )

    with context.begin_transaction():
        context.run_migrations()


# =========================
# Online migrations
# =========================
def run_migrations_online():
    connectable = engine_from_config(
        {"sqlalchemy.url": DATABASE_URL},
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
        connect_args={
            "options": f"-csearch_path={DB_SCHEMA}"
        } if "postgresql" in DATABASE_URL else {},
    )

    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            compare_type=True,
        )

        with context.begin_transaction():
            context.run_migrations()


# =========================
# Entry
# =========================
if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()