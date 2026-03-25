from sqlalchemy import Column, DateTime, Integer, Text, func
from sqlalchemy.orm import declarative_base

Base = declarative_base()


class History(Base):
    __tablename__ = "history"

    id = Column(Integer, primary_key=True)
    prompt = Column(Text, nullable=False)
    result = Column(Text, nullable=False)
    target_language = Column(Text, nullable=False, server_default="EN")
    timestamp = Column(DateTime, server_default=func.now())

    def to_dict(self):
        return {
            "id": self.id,
            "prompt": self.prompt,
            "result": self.result,
            "target_language": self.target_language,
            "timestamp": self.timestamp.isoformat(),
        }
