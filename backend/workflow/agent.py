import json
from google import genai
from google.genai import types

from workflow.interpretation import get_interpretation
from workflow.prompt import GENERAL_PROMPT, EXAM_SYS_PROMPT, CORRECTION_SYS_PROMPT


class TextAnalysisAgent:
    def __init__(self, gemini_key: str | None):
        if not gemini_key:
            raise ValueError("Gemini API key is required.")
        self.gemini_key = gemini_key
        self.genai_client = genai.Client(api_key=self.gemini_key)
        self.sys_prompt = GENERAL_PROMPT
        self.directives = ""


    def _get_analysis_directives(self, text: str) -> dict:
        """
        Analyzes the text to determine language, genre, and if correction is needed.
        """
        try:
            response = self.genai_client.models.generate_content(
                model="gemini-2.5-flash-lite",
                config=types.GenerateContentConfig(
                    system_instruction=EXAM_SYS_PROMPT,
                    temperature=0.0,
                    response_mime_type="application/json",
                ),
                contents=[text],
            )
            if response.text is None:
                raise(ValueError("llm response has no text."))
            directives = json.loads(response.text)
            # Basic validation
            if (
                "language" not in directives
                or "genre" not in directives
                or "correction_needed" not in directives
            ):
                raise ValueError("Invalid JSON structure from analysis model.")
            print(f"Directive: {directives}")
            return directives
        except Exception as e:
            # Fallback or error handling
            print(f"Error during analysis: {e}")
            # Provide a default, safe directive
            return {"language": "EN", "genre": "General", "correction_needed": True}


    def _correct_text(self, text: str) -> str:
        response = self.genai_client.models.generate_content(
                model="gemini-2.5-flash-lite",
                config=types.GenerateContentConfig(
                    system_instruction=CORRECTION_SYS_PROMPT,
                    temperature=0.1,
                ),
                contents=[text],
            )
        if response.text is not None:
            return response.text
        return text


    def run_analysis(self, text: str, user_language: str = "EN") -> str | None :
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
            print(f"Text need to be corrected, wait a moment ...")
            try:
                processed_text = self._correct_text(text)
            except Exception as e:
                print(f"Error during AI correction: {e}")
                # Proceed with original text if correction fails
                processed_text = text

        # 3. Get the final interpretation
        try:
            interpretation = get_interpretation(
                api_key=self.gemini_key,
                text=processed_text,
                learn_language=directives.get("language", "EN"),
                user_language=user_language,
            )
            return interpretation
        except Exception as e:
            print(f"Error during interpretation: {e}")
            return f"An error occurred during the final interpretation step: {e}"


from schema.analyze_schema import TextDerectives
from langchain.agents import create_agent
from langchain_google_genai import ChatGoogleGenerativeAI
from langgraph.graph import StateGraph, START, END
from langgraph.prebuilt import ToolNode
from typing import TypedDict, Optional


class MultiAgentState(TypedDict):
    messages: list
    text: str
    text_language: str
    user_language: str
    genre: str
    needs_correction: bool
    corrected_text: Optional[str]
    interpretation: Optional[str]


class TextAnalysisLangchain:
    def __init__(self, gemini_key: str | None):
        self.llm_flash = ChatGoogleGenerativeAI(
            model="gemini-2.5-flash",
            api_key=gemini_key,
            temperature=0.3
        )

        self.llm_lite = ChatGoogleGenerativeAI(
            model="gemini-2.5-flash-lite",
            api_key=gemini_key,
            temperature=0.0
        )

        self.graph = self._make_workflow()
    
    def _make_workflow(self):
        def detection_node(state: MultiAgentState):
            messages = [
                ("system", EXAM_SYS_PROMPT),
                ("user", state["text"])
            ]

            structured_llm = self.llm_lite.with_structured_output(TextDerectives)
            result = structured_llm.invoke(messages)
            
            return {
                "text_language": result.language,
                "genre": result.genre,
                "needs_correction": result.correction_needed
            }
        
        def correction_node(state: MultiAgentState):
            messages = [
                ("system", CORRECTION_SYS_PROMPT),
                ("user", state["text"])
            ]
            response = self.llm_lite.invoke(messages)
            
            return {
                "corrected_text": response.content,
                "text": response.content
            }

        def interpretation_node(state: MultiAgentState):
            lang_map = {
                "AR": "Arabic", "DE": "German", "ES": "Spanish",
                "EN": "English", "FR": "French", "IT": "Italian",
                "JA": "Japanese", "RU": "Russian", "ZH": "Chinese"
            }
            learn_lang = lang_map.get(state.get("text_language", "EN"), "English")
            user_lang = lang_map.get(state.get("user_language", "EN"), "English")

            sys_prompt = (
                GENERAL_PROMPT
                .replace("[LEARN_LANGUAGE]", learn_lang)
                .replace("[PROF_LANGUAGE]", user_lang)
            )

            messages = (
                ("system", sys_prompt),
                ("user", state["text"])
            )
            response = self.llm_flash.invoke(messages)

            return {
                "interpretation": response.content
            }

        def route_after_detection(state: MultiAgentState) -> str:
            if state.get("needs_correction", False):
                return "correct"
            else:
                return "interpret"

        workflow = StateGraph(MultiAgentState)
        workflow.add_node("detect", detection_node)
        workflow.add_node("correct", correction_node)
        workflow.add_node("interpret", interpretation_node)
        workflow.add_edge(START, "detect")
        workflow.add_conditional_edges(
            "detect",
            route_after_detection,
            {"correct": "correct", "interpret": "interpret"}
        )
        workflow.add_edge("correct", "interpret")
        workflow.add_edge("interpret", END)
        
        return workflow.compile()
