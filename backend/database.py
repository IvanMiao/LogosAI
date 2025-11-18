from sqlalchemy import Column, Integer, Text, DateTime, func, create_engine
from sqlalchemy.orm import declarative_base, sessionmaker, Session
from sqlalchemy.dialects.postgresql import JSON
from sqlalchemy.pool import StaticPool
import os


Base = declarative_base()


class History(Base):
    __tablename__ = 'history'

    id = Column(Integer, primary_key=True)
    prompt = Column(Text, nullable=False)
    result = Column(Text, nullable=False)
    timestamp = Column(DateTime, server_default=func.now())

    key_vocabulary = Column(JSON)
    grammar_points = Column(JSON)
    identified_errors = Column(JSON)

    def to_dict(self):
        return {
            'id': self.id,
            'prompt': self.prompt,
            'result': self.result,
            'timestamp': self.timestamp.isoformat(),
            'key_vocabulary': self.key_vocabulary,
            'grammar_points': self.grammar_points,
            'identified_errors': self.identified_errors
        }

# Check for a testing environment
if os.getenv("TESTING"):
    DATABASE_URL = "sqlite:///:memory:"
    engine = create_engine(
        DATABASE_URL,
        connect_args={"check_same_thread": False},
        poolclass=StaticPool  # Use StaticPool for in-memory DB persistence
    )
else:
    # Production database configuration
    pg_user = os.getenv('POSTEGRES_USER')
    pg_password = os.getenv('POSTGRES_PASSWORD')
    pg_host = os.getenv('POSTGRES_HOST', 'localhost')
    pg_port = os.getenv('POSTGRES_PORT', '5432')
    pg_db = os.getenv('POSTGRES_DB')

    if not all([pg_user, pg_password, pg_host, pg_port, pg_db]):
        raise ValueError("One or more PostgreSQL environment variables are not set.")

    DATABASE_URL = f"postgresql+psycopg2://{pg_user}:{pg_password}@{pg_host}:{pg_port}/{pg_db}"
    engine = create_engine(
        DATABASE_URL,
        pool_size=5,
        max_overflow=10,
        pool_pre_ping=True
    )

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def init_db():
    Base.metadata.create_all(bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
