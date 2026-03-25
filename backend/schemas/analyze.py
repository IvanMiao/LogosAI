from pydantic import BaseModel


class AnalysisRequest(BaseModel):
    text: str
    user_language: str = "EN"
    model: str = "gemini-2.5-flash"


class AnalysisResponse(BaseModel):
    result: str
    success: bool
    error: str | None = None


class TextDerectives(BaseModel):
    language: str
    genre: str
    correction_needed: bool
