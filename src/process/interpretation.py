from google import genai
from google.genai import types
from process.sys_prompt import GENERAL_PROMPT, NEWS_PROMPT, PHILO_PROMPT


NARRATIVE_PROMPT = ""
POEM_PROMPT = ""


def get_interpretation(
    genre: str, api_key: str, text: str, learn_language: str, prof_language: str
) -> str:
    if not api_key:
        return "Error: Gemini API Key not found."
    if not text:
        return "Error: text not found."

    try:
        client = genai.Client(api_key=api_key)
    except Exception as e:
        return f"ERROR: {str(e)}"

    lang_map = {
        "AR": "Arabic",
        "DE": "German",
        "ES": "Spanish",
        "EN": "English",
        "FR": "French",
        "IT": "Italian",
        "JA": "Japanese",
        "RU": "Russian",
        "ZH": "Chinese",
    }
    learn_lang = lang_map.get(learn_language.upper(), "English")
    prof_lang = lang_map.get(prof_language.upper(), "English")
    genres = {
        "general": GENERAL_PROMPT,
        "news": NEWS_PROMPT,
        "narrative": NARRATIVE_PROMPT,
        "poem": POEM_PROMPT,
        "philosophy": PHILO_PROMPT,
    }
    if genre.lower() in ["general", "news", "philosophy"]:
        sys_prompt = (
            genres[genre.lower()]
            .replace("[LEARN_LANGUAGE]", learn_lang)
            .replace("[PROF_LANGUAGE]", prof_lang)
        )

    response = client.models.generate_content(
        model="gemini-2.5-pro",
        config=types.GenerateContentConfig(
            system_instruction=sys_prompt,
            temperature=0.3,
        ),
        contents=[text],
    )
    return response.text
