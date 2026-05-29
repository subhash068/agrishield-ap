from __future__ import annotations
from urllib.parse import urlparse
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker, DeclarativeBase
from .config import settings

engine = create_engine(settings.postgres_dsn, pool_pre_ping=True)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False, future=True)

class Base(DeclarativeBase):
    pass

def _get_dbname_from_dsn(dsn: str) -> str:
    parsed = urlparse(dsn)
    # dsn path is like "/agrishield"
    dbname = (parsed.path or "").lstrip("/")
    if not dbname:
        raise ValueError(f"Could not infer database name from DSN path: {dsn}")
    return dbname

def ensure_postgres_database_exists(*, target_dsn: str | None = None, maintenance_db: str = "postgres") -> None:
    """
    Ensures the target database exists in Postgres by connecting to the maintenance DB.
    Idempotent: if database already exists, does nothing.

    Notes:
    - SQLAlchemy cannot create DBs; this uses a direct SQL command.
    - Raises on connection/auth issues so the caller can decide whether to continue startup.
    """
    dsn = target_dsn or settings.postgres_dsn
    dbname = _get_dbname_from_dsn(dsn)

    # Build a DSN that connects to the maintenance DB (usually "postgres").
    parsed = urlparse(dsn)
    base = parsed._replace(path=f"/{maintenance_db}")
    maintenance_dsn = base.geturl()

    maintenance_engine = create_engine(maintenance_dsn, pool_pre_ping=True)

    # CREATE DATABASE must run outside an explicit transaction block (Postgres limitation).
    with maintenance_engine.connect() as conn:
        exists = conn.execute(
            text("SELECT 1 FROM pg_database WHERE datname = :dbname"),
            {"dbname": dbname},
        ).first()

    if exists is None:
        # Run CREATE DATABASE with AUTOCOMMIT to avoid ActiveSqlTransaction errors.
        with maintenance_engine.connect().execution_options(isolation_level="AUTOCOMMIT") as conn2:
            # Identifiers must be quoted; since DB name is from DSN, we safely double-quote it.
            conn2.execute(text(f'CREATE DATABASE "{dbname}"'))