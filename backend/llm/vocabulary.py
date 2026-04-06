from typing import cast

from langchain_core.messages import HumanMessage, SystemMessage
from langchain_google_genai import ChatGoogleGenerativeAI
from pydantic import BaseModel, Field


class _VocabularyEntryStructured(BaseModel):
    term: str = Field(description="Word or expression in source text")
    sentence: str = Field(description="Original sentence containing the term")
    context_meaning: str = Field(
        description="Meaning of the term in this specific context"
    )
    dictionary_meaning: str = Field(description="General dictionary-style meaning")


class _VocabularyExtractionStructured(BaseModel):
    items: list[_VocabularyEntryStructured]


VOCABULARY_EXTRACTION_SYS_PROMPT = """
Role and Goal:
You are an expert language tutor AI helping an
intermediate-to-advanced learner (CEFR B1-C2).
Given an input text, select the most valuable words or expressions for learning.

Language Handling Rules:
1. Do not assume a fixed source language.
2. Detect and follow the language of the input text.
3. Use the provided learner preferred language code when generating
    `context_meaning` and `dictionary_meaning`.
4. If the learner language cannot be used reliably, fall back to concise English.

Selection Rules:
1. Focus on intermediate-to-advanced vocabulary and expressions.
2. Exclude very basic high-frequency function words.
3. Include both single words and fixed expressions when useful.
4. Prefer items that are highly reusable or important for nuanced comprehension.

Output Requirements:
Return structured data only, with exactly these fields for each item:
- term: the exact word/expression from the text
- sentence: the original sentence in the document where it appears
- context_meaning: concise context-aware meaning in the learner's
    preferred language (or English fallback)
- dictionary_meaning: concise dictionary-style meaning in the learner's
    preferred language (or English fallback)

Quality Rules:
- Keep each field concise and precise.
- Keep sentence exactly in source language.
- Do not output duplicate terms.
- Return at most 10 items.
"""


def extract_vocabulary_items(
    llm_lite: ChatGoogleGenerativeAI,
    text: str,
    max_items: int = 10,
    user_language: str = "EN",
) -> list[dict[str, str]]:
    structured_llm = llm_lite.with_structured_output(_VocabularyExtractionStructured)
    messages = [
        SystemMessage(VOCABULARY_EXTRACTION_SYS_PROMPT),
        HumanMessage(
            f"Learner preferred language (ISO 639-1): {user_language}\n\n"
            f"Text:\n{text}"
        ),
    ]
    extraction = cast(_VocabularyExtractionStructured, structured_llm.invoke(messages))
    return [item.model_dump() for item in extraction.items[:max_items]]
