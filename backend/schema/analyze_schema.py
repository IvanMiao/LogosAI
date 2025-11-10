from pydantic import BaseModel
from typing import List


class AnalysisRequest(BaseModel):
    text: str
    user_language: str = "EN"


class AnalysisResponse(BaseModel):
    result: str
    success: bool
    error: str | None = None


class HistoryItem(BaseModel):
    id: int
    prompt: str
    result: str
    timestamp: str


class HistoryResponse(BaseModel):
    history: List[HistoryItem]
    success: bool
    error: str | None = None


class TextDerectives(BaseModel):
    language: str
    genre: str
    correction_needed: bool
