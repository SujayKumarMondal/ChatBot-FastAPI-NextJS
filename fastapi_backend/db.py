import os
from urllib.parse import quote
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv

load_dotenv()

# =========================
# Database Configuration
# =========================
USE_POSTGRES = os.getenv("USE_POSTGRES", "").lower() == "true"
DATABASE_URL = os.getenv("DATABASE_URL", "")

DB_NAME = os.getenv("DB_NAME", "")
DB_USER = os.getenv("DB_USER", "")
DB_PASSWORD = os.getenv("DB_PASSWORD", "")
DB_HOST = os.getenv("DB_HOST", "localhost")
DB_PORT = os.getenv("DB_PORT", "5432")
DB_SCHEMA = os.getenv("DB_SCHEMA", "public")

# Encode password (handles special characters like @, #, etc.)
encoded_password = quote(DB_PASSWORD, safe="")

# =========================
# Database URL + Engine
# =========================
if DATABASE_URL:
    print("[DATABASE] Using DATABASE_URL from environment")
    engine = create_engine(
        DATABASE_URL,
        pool_pre_ping=True,
    )
elif USE_POSTGRES and DB_NAME:
    DATABASE_URL = (
        f"postgresql://{DB_USER}:{encoded_password}@{DB_HOST}:{DB_PORT}/{DB_NAME}"
    )

    print(f"[DATABASE] Using PostgreSQL ({DB_SCHEMA} schema)")

    engine = create_engine(
        DATABASE_URL,
        pool_pre_ping=True,
    )

else:
    # Fallback to SQLite for local dev
    BASE_DIR = os.path.dirname(os.path.abspath(__file__))
    sqlite_path = os.path.join(BASE_DIR, "db.sqlite3")

    DATABASE_URL = f"sqlite:///{sqlite_path}"

    print(f"[DATABASE] Using SQLite: {sqlite_path}")

    engine = create_engine(
        DATABASE_URL,
        connect_args={"check_same_thread": False},
    )

# =========================
# Session Factory
# =========================
SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine,
)

# =========================
# Dependency (FastAPI)
# =========================
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# =========================
# Initialize DB (optional)
# =========================
def init_db():
    from models import Base
    print(f"[DATABASE] Creating/checking tables in schema: {DB_SCHEMA}")
    try:
        Base.metadata.create_all(bind=engine)
        print("[DATABASE] Tables created or verified successfully")
    except Exception as exc:
        print(f"[DATABASE] Table initialization failed: {exc}")
        raise