from google import genai
from google.genai import types


SYS_PROMPT_TRANSLATION = """
You are an expert translator.
Your sole purpose is to accurately and faithfully translate the provided text into the [TARGET_LANGUAGE].
Do not add any extra information, explanations, or stylistic changes.
Maintain the original meaning and tone as closely as possible.
"""

def get_translaton(text: str, api_key: str, target_language: str) -> str:

	if not api_key:
		return "Error: Gemini API Key not found."
	if not text:
		return "Error: text not found."

	client = genai.Client(api_key=api_key)

	lang_map = {"Deutsch": "German", "English": "English", "Français": "French", "Русский язык": "Russian", "中文": "Chinese"}
	tar_lang = lang_map.get(target_language, "English")
	sys_prompt = SYS_PROMPT_TRANSLATION.replace("[TARGET_LANGUAGE]", tar_lang)
	response = client.models.generate_content(
		model="gemini-2.5-flash-preview-05-20",
		config=types.GenerateContentConfig(
			system_instruction=sys_prompt,
			temperature=0.1,
			),
		contents=[text]
	)
	return response.text
