from pydantic import BaseModel, Field


class VocabularyExtractionRequest(BaseModel):
    text: str = Field(min_length=1)
    max_items: int = Field(default=10, ge=1, le=10)
    user_language: str = "EN"
    model: str = "gemini-2.5-flash"


class VocabularyEntry(BaseModel):
    term: str
    sentence: str
    context_meaning: str
    dictionary_meaning: str


class VocabularyExtractionResponse(BaseModel):
    items: list[VocabularyEntry]
    success: bool
    error: str | None = None
