import os

from sqlalchemy import create_engine, inspect, text
from sqlalchemy.orm import sessionmaker

from db.models import Base

pg_user = os.getenv("POSTGRES_USER")
pg_password = os.getenv("POSTGRES_PASSWORD")
pg_host = os.getenv("POSTGRES_HOST", "localhost")
pg_port = os.getenv("POSTGRES_PORT", "5432")
pg_db = os.getenv("POSTGRES_DB")

if not all((pg_user, pg_password, pg_db)):
    raise ValueError(
        "Missing required PostgreSQL environment variables. "
        "Please set POSTGRES_USER, POSTGRES_PASSWORD, and POSTGRES_DB."
    )

DATABASE_URL = (
    f"postgresql+psycopg2://{pg_user}:{pg_password}@{pg_host}:{pg_port}/{pg_db}"
)

engine = create_engine(DATABASE_URL, pool_size=5, max_overflow=10, pool_pre_ping=True)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def init_db():
    Base.metadata.create_all(bind=engine)
    try:
        inspector = inspect(engine)
        columns = [c["name"] for c in inspector.get_columns("history")]
        if "target_language" not in columns:
            with engine.connect() as conn:
                conn.execute(
                    text(
                        "ALTER TABLE history ADD COLUMN target_language "
                        "TEXT DEFAULT 'EN' NOT NULL"
                    )
                )
                conn.commit()
                print("Added column 'target_language' to 'history' table.")
    except Exception as e:
        print(f"Migration error: {e}")


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
