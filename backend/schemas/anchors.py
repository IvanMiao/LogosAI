from typing import Literal

from pydantic import BaseModel, Field

AnchorScope = Literal["document", "paragraph", "selection"]
AnchorSkill = Literal["explain", "translate", "vocab"]


class DocumentPayload(BaseModel):
    id: str
    title: str | None = None
    text: str = Field(min_length=1)


class TextAnchorPayload(BaseModel):
    id: str
    quote: str = Field(min_length=1)
    start_offset: int = Field(ge=0)
    end_offset: int = Field(gt=0)
    scope: AnchorScope = "selection"


class AnchorExplainRequest(BaseModel):
    document: DocumentPayload
    anchor: TextAnchorPayload
    user_language: str = "EN"
    model: str = "gemini-2.5-flash"


class AnchorRunRequest(AnchorExplainRequest):
    skill: AnchorSkill
