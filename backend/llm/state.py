from typing import Optional, TypedDict

from llm.prompts import GENERAL_PROMPT

LANG_MAP = {
    "AR": "Arabic",
    "DE": "German",
    "EN": "English",
    "ES": "Spanish",
    "FR": "French",
    "IT": "Italian",
    "JA": "Japanese",
    "RU": "Russian",
    "ZH": "Chinese",
}


class MultiAgentState(TypedDict):
    messages: list
    text: str
    text_language: str
    user_language: str
    genre: str
    needs_correction: bool
    corrected_text: Optional[str]
    interpretation: Optional[str]


def create_initial_state(text: str, user_language: str) -> MultiAgentState:
    return {
        "messages": [],
        "text": text,
        "text_language": "",
        "genre": "",
        "needs_correction": False,
        "corrected_text": None,
        "interpretation": None,
        "user_language": user_language.upper(),
    }


def build_analysis_prompt(text_language: str, user_language: str) -> str:
    learn_lang = LANG_MAP.get(text_language, "English")
    user_lang = LANG_MAP.get(user_language, "English")
    return GENERAL_PROMPT.replace("[LEARN_LANGUAGE]", learn_lang).replace(
        "[PROF_LANGUAGE]", user_lang
    )
