"""
SQLAlchemy database setup and models for the Air Quality Anomaly Detection system.
Uses SQLite as the backing store.
"""

import os
from datetime import datetime

from sqlalchemy import Column, DateTime, Float, Integer, String, Text, create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker

# ---------------------------------------------------------------------------
# Database path — anomalies.db lives alongside the backend code
# ---------------------------------------------------------------------------
DB_DIR = os.path.dirname(os.path.abspath(__file__))
DATABASE_URL = f"sqlite:///{os.path.join(DB_DIR, 'anomalies.db')}"

engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    pass


# ---------------------------------------------------------------------------
# ORM model
# ---------------------------------------------------------------------------
class Run(Base):
    __tablename__ = "runs"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    filename = Column(String, nullable=False)
    run_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    contamination = Column(String, nullable=False)
    results_json = Column(Text, nullable=False)  # JSON string of scored rows


# ---------------------------------------------------------------------------
# Create tables on import (no migrations needed per requirements)
# ---------------------------------------------------------------------------
Base.metadata.create_all(bind=engine)


# ---------------------------------------------------------------------------
# FastAPI dependency
# ---------------------------------------------------------------------------
def get_db():
    """Yield a database session and ensure it is closed after use."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
