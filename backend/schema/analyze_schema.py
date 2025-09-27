from pydantic import BaseModel


class AnalysisRequest(BaseModel):
    text: str
    user_language: str = "EN"


class AnalysisResponse(BaseModel):
    result: str
    success: bool
    error: str | None = None
