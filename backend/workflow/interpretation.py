from google import genai
from google.genai import types
from workflow.prompt import GENERAL_PROMPT


def get_interpretation(
    api_key: str,
    text: str,
    learn_language: str,
    user_language: str
) -> str | None :
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
    user_lang = lang_map.get(user_language.upper(), "English")

    sys_prompt = (
            GENERAL_PROMPT
            .replace("[LEARN_LANGUAGE]", learn_lang)
            .replace("[PROF_LANGUAGE]", user_lang)
        )

    response = client.models.generate_content(
        model="gemini-2.5-flash",
        config=types.GenerateContentConfig(
            system_instruction=sys_prompt,
            temperature=0.3,
        ),
        contents=[text],
    )
    return response.text
