from pydantic import BaseModel
from typing import List


class AnalysisRequest(BaseModel):
    text: str
    user_language: str = "EN"


class AnalysisResponse(BaseModel):
    result: str
    success: bool
    error: str | None = None


class StructuredInterpretation(BaseModel):
    summary: str
    key_vocabulary: List[dict]
    grammar_points: List[dict]
    identified_errors: List[dict]


class HistoryItem(BaseModel):
    id: int
    prompt: str
    result: str
    timestamp: str
    key_vocabulary: List[dict] | None = None
    grammar_points: List[dict] | None = None
    identified_errors: List[dict] | None = None


class HistoryResponse(BaseModel):
    history: List[HistoryItem]
    success: bool
    error: str | None = None


class TextDerectives(BaseModel):
    language: str
    genre: str
    correction_needed: bool


class SettingsRequest(BaseModel):
    gemini_api_key: str | None = None
    model: str = "gemini-2.5-flash"


class SettingsResponse(BaseModel):
    gemini_api_key: str
    model: str
    has_api_key: bool
    success: bool
    error: str | None = None
