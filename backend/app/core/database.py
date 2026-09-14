import os
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

# Load DATABASE_URL from environment or fallback to local sqlite
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./poetrystudio.db")

# For SQLite, we need to allow multithreading access
connect_args = {}
if DATABASE_URL.startswith("sqlite"):
    connect_args["check_same_thread"] = False

engine = create_engine(
    DATABASE_URL,
    connect_args=connect_args
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def init_db():
    Base.metadata.create_all(bind=engine)
    # Ensure added columns exist in existing databases without requiring manual migrations
    columns_to_add = [
        ("audience_reviews", "appeal_score", "INTEGER"),
        ("audience_reviews", "engagement_score", "INTEGER"),
        ("audience_reviews", "actionable_enhancements_json", "JSON" if not DATABASE_URL.startswith("sqlite") else "TEXT"),
    ]
    try:
        from sqlalchemy import text
        with engine.begin() as conn:
            for table, col, col_type in columns_to_add:
                try:
                    if DATABASE_URL.startswith("postgresql"):
                        conn.execute(text(f"ALTER TABLE {table} ADD COLUMN IF NOT EXISTS {col} {col_type};"))
                    else:
                        conn.execute(text(f"ALTER TABLE {table} ADD COLUMN {col} {col_type};"))
                except Exception:
                    pass
    except Exception:
        pass

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
