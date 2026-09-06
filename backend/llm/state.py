from typing import TypedDict

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


class AnalysisState(TypedDict):
    text: str
    text_language: str
    user_language: str
    needs_correction: bool


def create_initial_state(text: str, user_language: str) -> AnalysisState:
    return {
        "text": text,
        "text_language": "",
        "needs_correction": False,
        "user_language": user_language.upper(),
    }


def build_analysis_prompt(text_language: str, user_language: str) -> str:
    learn_lang = LANG_MAP.get(text_language, "English")
    user_lang = LANG_MAP.get(user_language, "English")

    return GENERAL_PROMPT.replace("[LEARN_LANGUAGE]", learn_lang).replace(
        "[PROF_LANGUAGE]", user_lang
    )
