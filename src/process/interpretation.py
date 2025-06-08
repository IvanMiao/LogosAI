from google import genai
from google.genai import types
from process.sys_prompt import GENERAL_PROMPT ,NEWS_PROMPT


NARRATIVE_PROMPT = ""
POEM_PROMPT = ""
PHILO_PROMPT = ""

def get_interpretation(genre: str,
					   api_key: str,
					   text: str,
					   learn_language: str,
					   prof_language: str) -> str:

	if not api_key:
		return "Error: Gemini API Key not found."
	if not text:
		return "Error: text not found."

	client = genai.Client(api_key=api_key)

	lang_map ={"ZH": "Chinese", "EN": "English", "FR": "French"}
	learn_lang = lang_map.get(learn_language.upper(), "English")
	prof_lang = lang_map.get(prof_language.upper(), "English")
	genres = {
		"general": GENERAL_PROMPT,
		"news": NEWS_PROMPT, 
		"narrative": NARRATIVE_PROMPT, 
		"poem": POEM_PROMPT,
		"philosophy": PHILO_PROMPT
		}
	if genre.lower() == "general":
		sys_prompt = genres["general"].replace("[LEARN_LANGUAGE]", learn_lang).replace("[PROF_LANGUAGE]", prof_lang)
	elif genre.lower() == "news":
		sys_prompt = genres["news"].replace("[LEARN_LANGUAGE]", learn_lang).replace("[PROF_LANGUAGE]", prof_lang)

	response = client.models.generate_content(
		model="gemini-2.5-flash-preview-05-20",
		config=types.GenerateContentConfig(
			system_instruction=sys_prompt,
			temperature=0.3,
			),
		contents=[text]
	)
	return response.text
