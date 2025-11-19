from workflow.prompt import GENERAL_PROMPT, EXAM_SYS_PROMPT, CORRECTION_SYS_PROMPT
from schema.analyze_schema import TextDerectives
from langchain.agents import create_agent
from langchain_core.messages import SystemMessage, HumanMessage
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
    def __init__(self, gemini_key: str | None, model: str = "gemini-2.5-flash"):
        if not gemini_key:
            raise ValueError("Gemini API key is required.")
        
        # Main model for interpretation
        self.llm_flash = ChatGoogleGenerativeAI(
            model=model,
            api_key=gemini_key,
            temperature=0.3
        )

        # Lightweight model for detection and correction
        self.llm_lite = ChatGoogleGenerativeAI(
            model="gemini-2.5-flash-lite",
            api_key=gemini_key,
            temperature=0.0
        )

        self.graph = self._make_workflow()

    def _make_workflow(self):
        def detection_node(state: MultiAgentState):
            messages = [
                SystemMessage(EXAM_SYS_PROMPT),
                HumanMessage(state["text"])
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
                SystemMessage(CORRECTION_SYS_PROMPT),
                HumanMessage(state["text"])
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
                SystemMessage(sys_prompt),
                HumanMessage(state["text"])
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
