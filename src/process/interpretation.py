from google import genai
from google.genai import types
import os


API_KEY = os.envrion["GENIMI_API_KEY"]

client = genai.Client(api_key=API_KEY)

NEWS_PROMPT = ""
NARRATIVE_PROMPT = ""
POEM_PROMPT = ""
PHILO_PROMPT = ""

def get_interpretation(genre: str) -> str:

	prompt = None
	genres = {
		"news": NEWS_PROMPT, 
		"narrative": NARRATIVE_PROMPT, 
		"poem": POEM_PROMPT,
		"philosophy": PHILO_PROMPT
		}
			
	# add sys prompt
	response = client.models.generate_content(
		model="gemini-2.5-flash-preview-05-20",
		config=types.GenerateContentConfig(
			system_instruction=prompt,
			temperature=0.3,
			),
		contents=None
	)

	return response.text
