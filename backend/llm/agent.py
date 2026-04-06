from collections.abc import AsyncIterator

from langchain_core.messages import HumanMessage, SystemMessage
from langchain_google_genai import ChatGoogleGenerativeAI
from langgraph.graph import END, START, StateGraph

from llm.prompts import CORRECTION_SYS_PROMPT, EXAM_SYS_PROMPT
from llm.state import MultiAgentState, build_analysis_prompt, create_initial_state
from llm.vocabulary import extract_vocabulary_items
from schemas.analyze import TextDerectives


class TextAnalysisLangchain:
    def __init__(self, gemini_key: str | None, model: str = "gemini-2.5-flash"):
        if not gemini_key:
            raise ValueError("Gemini API key is required.")

        # Main model for interpretation
        self.llm_flash = ChatGoogleGenerativeAI(
            model=model, api_key=gemini_key, temperature=0.3
        )

        # Lightweight model for detection and correction
        self.llm_lite = ChatGoogleGenerativeAI(
            model="gemini-2.5-flash-lite", api_key=gemini_key, temperature=0.0
        )

        self.graph = self._make_workflow()

    def extract_learning_vocabulary(
        self,
        text: str,
        max_items: int = 10,
        user_language: str = "EN",
    ) -> list[dict[str, str]]:
        if not text.strip():
            return []
        return extract_vocabulary_items(
            self.llm_lite,
            text=text,
            max_items=max_items,
            user_language=user_language,
        )

    @staticmethod
    def _content_to_text(content: object) -> str:
        if isinstance(content, str):
            return content

        if isinstance(content, list):
            fragments: list[str] = []
            for item in content:
                if isinstance(item, str):
                    fragments.append(item)
                    continue

                if isinstance(item, dict):
                    text = item.get("text")
                    if isinstance(text, str):
                        fragments.append(text)
                    continue

                text = getattr(item, "text", None)
                if isinstance(text, str):
                    fragments.append(text)

            return "".join(fragments)

        return ""

    def _check_limit(self, text: str) -> bool:
        LIMIT = 200000
        if (len(text) > LIMIT):
            return False
        return True

    async def analyze_stream(
        self, text: str, user_language: str
    ) -> AsyncIterator[dict[str, str]]:
        if not (self._check_limit(text)):
            text = self._summarize(text)

        state = create_initial_state(text, user_language)

        yield {"event": "stage", "stage": "detect"}
        detection_messages = [
            SystemMessage(EXAM_SYS_PROMPT),
            HumanMessage(state["text"]),
        ]
        structured_llm = self.llm_lite.with_structured_output(TextDerectives)
        directives = await structured_llm.ainvoke(detection_messages)

        state["text_language"] = directives.language
        state["genre"] = directives.genre
        state["needs_correction"] = directives.correction_needed

        if state["needs_correction"]:
            yield {"event": "stage", "stage": "correct"}
            correction_messages = [
                SystemMessage(CORRECTION_SYS_PROMPT),
                HumanMessage(state["text"]),
            ]
            corrected_response = await self.llm_lite.ainvoke(correction_messages)
            corrected_text = self._content_to_text(corrected_response.content).strip()
            if corrected_text:
                state["corrected_text"] = corrected_text
                state["text"] = corrected_text

        yield {"event": "stage", "stage": "interpret"}
        sys_prompt = build_analysis_prompt(
            state["text_language"], state["user_language"]
        )
        interpretation_messages = (
            SystemMessage(sys_prompt),
            HumanMessage(state["text"]),
        )

        chunks: list[str] = []
        async for chunk in self.llm_flash.astream(interpretation_messages):
            delta = self._content_to_text(chunk.content)
            if not delta:
                continue
            chunks.append(delta)
            yield {"event": "chunk", "delta": delta}

        result = "".join(chunks).strip()
        if not result:
            fallback = await self.llm_flash.ainvoke(interpretation_messages)
            result = self._content_to_text(fallback.content).strip()
            if result:
                yield {"event": "chunk", "delta": result}

        if not result:
            raise ValueError("Analysis failed - no interpretation generated")

        yield {"event": "done", "result": result}

    def _make_workflow(self):
        def detection_node(state: MultiAgentState):
            messages = [SystemMessage(EXAM_SYS_PROMPT), HumanMessage(state["text"])]

            structured_llm = self.llm_lite.with_structured_output(TextDerectives)
            result = structured_llm.invoke(messages)

            return {
                "text_language": result.language,
                "genre": result.genre,
                "needs_correction": result.correction_needed,
            }

        def correction_node(state: MultiAgentState):
            messages = [
                SystemMessage(CORRECTION_SYS_PROMPT),
                HumanMessage(state["text"]),
            ]
            response = self.llm_lite.invoke(messages)

            return {"corrected_text": response.content, "text": response.content}

        def interpretation_node(state: MultiAgentState):
            sys_prompt = build_analysis_prompt(
                state.get("text_language", "EN"),
                state.get("user_language", "EN"),
            )
            messages = (SystemMessage(sys_prompt), HumanMessage(state["text"]))
            response = self.llm_flash.invoke(messages)

            return {"interpretation": response.content}

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
            {"correct": "correct", "interpret": "interpret"},
        )
        workflow.add_edge("correct", "interpret")
        workflow.add_edge("interpret", END)

        return workflow.compile()
