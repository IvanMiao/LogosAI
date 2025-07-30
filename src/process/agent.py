import json
from google import genai
from google.genai import types
from process.ocr import correct_text_with_ai
from process.interpretation import get_interpretation

AGENT_SYS_PROMPT = """
You are a highly intelligent text analysis agent. Your sole purpose is to analyze a given text and return a JSON object with three keys: "language", "genre", and "correction_needed".

1.  **"language"**: Identify the primary language of the text. The value must be one of the following ISO 639-1 codes: ["AR", "DE", "ES", "EN", "FR", "IT", "JA", "RU", "ZH"].

2.  **"genre"**: Analyze the text's style, tone, and content to determine its genre. The value must be one of the following strings: ["General", "News", "Philosophy", "Narrative", "Poem", "Paper"].
    *   "News": Reports on current events.
    *   "Philosophy": Discusses fundamental questions about existence, knowledge, values, reason, mind, and language.
    *   "Narrative": Tells a story.
    *   "Poem": Uses aesthetic and rhythmic qualities of language.
    *   "Paper": A formal academic or scientific paper.
    *   "General": Any text that does not fit neatly into the other categories.

3.  **"correction_needed"**: Determine if the text contains obvious OCR errors, typos, or significant grammatical mistakes that require correction. The value must be a boolean (`true` or `false`). Set it to `true` if you see scrambled words, weird symbols, or frequent misspellings.

Your response MUST be a single, valid JSON object and nothing else. Do not add any explanations, comments, or markdown formatting.

Example input text:
"Teh qick brown fox juumps over teh lazy dog. It was a sunny day in london."

Example output:
{
  "language": "EN",
  "genre": "Narrative",
  "correction_needed": true
}
"""


class AutomatedAnalysisAgent:
    def __init__(self, mistral_key: str, gemini_key: str):
        if not mistral_key or not gemini_key:
            raise ValueError("Both Mistral and Gemini API keys are required.")
        self.mistral_key = mistral_key
        self.gemini_key = gemini_key
        self.genai_client = genai.Client(api_key=self.gemini_key)

    def _get_analysis_directives(self, text: str) -> dict:
        """
        Analyzes the text to determine language, genre, and if correction is needed.
        """
        try:
            response = self.genai_client.models.generate_content(
                model="gemini-2.5-flash",
                config=types.GenerateContentConfig(
                    system_instruction=AGENT_SYS_PROMPT,
                    temperature=0.0,
                    response_mime_type="application/json",
                ),
                contents=[text],
            )
            directives = json.loads(response.text)
            # Basic validation
            if (
                "language" not in directives
                or "genre" not in directives
                or "correction_needed" not in directives
            ):
                raise ValueError("Invalid JSON structure from analysis model.")
            return directives
        except Exception as e:
            # Fallback or error handling
            print(f"Error during analysis: {e}")
            # Provide a default, safe directive
            return {"language": "EN", "genre": "General", "correction_needed": True}

    def run(self, text: str, prof_language: str = "EN") -> str:
        """
        Runs the full automated analysis and interpretation workflow.
        """
        if not text or not text.strip():
            return "Error: Input text is empty."

        # 1. Get analysis directives from the agent's brain
        directives = self._get_analysis_directives(text)

        processed_text = text
        # 2. Conditionally apply AI correction
        if directives.get("correction_needed", False):
            try:
                processed_text = correct_text_with_ai(text, self.mistral_key)
            except Exception as e:
                print(f"Error during AI correction: {e}")
                # Proceed with original text if correction fails
                processed_text = text

        # 3. Get the final interpretation
        try:
            interpretation = get_interpretation(
                genre=directives.get("genre", "General"),
                api_key=self.gemini_key,
                text=processed_text,
                learn_language=directives.get("language", "EN"),
                prof_language=prof_language,
            )
            return interpretation
        except Exception as e:
            print(f"Error during interpretation: {e}")
            return f"An error occurred during the final interpretation step: {e}"
