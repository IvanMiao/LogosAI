from collections.abc import AsyncIterator

from langchain_core.messages import BaseMessage, HumanMessage, SystemMessage
from langchain_google_genai import ChatGoogleGenerativeAI

from llm.prompts import CORRECTION_SYS_PROMPT, EXAM_SYS_PROMPT
from llm.state import AnalysisState, build_analysis_prompt, create_initial_state
from monitoring.llm import track_llm_stage
from schemas.analyze import TextDirectives


class TextAnalysisLangchain:
    def __init__(self, gemini_key: str | None, model: str = "gemini-2.5-flash"):
        if not gemini_key:
            raise ValueError("Gemini API key is required.")

        self.model = model
        self.lite_model = "gemini-2.5-flash-lite"
        self.llm_flash = ChatGoogleGenerativeAI(
            model=model, api_key=gemini_key, temperature=0.3
        )
        self.llm_lite = ChatGoogleGenerativeAI(
            model=self.lite_model, api_key=gemini_key, temperature=0.0
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

    @staticmethod
    def _detection_messages(text: str) -> list[BaseMessage]:
        return [SystemMessage(EXAM_SYS_PROMPT), HumanMessage(text)]

    @staticmethod
    def _correction_messages(text: str) -> list[BaseMessage]:
        return [SystemMessage(CORRECTION_SYS_PROMPT), HumanMessage(text)]

    @staticmethod
    def _interpretation_messages(state: AnalysisState) -> list[BaseMessage]:
        prompt = build_analysis_prompt(
            state["text_language"],
            state["user_language"],
        )
        return [SystemMessage(prompt), HumanMessage(state["text"])]

    async def _detect(self, state: AnalysisState) -> None:
        messages = self._detection_messages(state["text"])
        structured_llm = self.llm_lite.with_structured_output(TextDirectives)
        with track_llm_stage(
            "detect",
            self.lite_model,
            messages,
        ) as telemetry:
            directives = await structured_llm.ainvoke(messages)
            telemetry.record_response(directives.model_dump_json())

        state["text_language"] = directives.language
        state["genre"] = directives.genre
        state["needs_correction"] = directives.correction_needed

    async def _correct(self, state: AnalysisState) -> None:
        messages = self._correction_messages(state["text"])
        with track_llm_stage(
            "correct",
            self.lite_model,
            messages,
        ) as telemetry:
            response = await self.llm_lite.ainvoke(messages)
            corrected_text = self._content_to_text(response.content).strip()
            telemetry.record_response(corrected_text)

        if corrected_text:
            state["corrected_text"] = corrected_text
            state["text"] = corrected_text

    async def _interpret(self, messages: list[BaseMessage]) -> str:
        with track_llm_stage(
            "interpret",
            self.model,
            messages,
        ) as telemetry:
            response = await self.llm_flash.ainvoke(messages)
            result = self._content_to_text(response.content).strip()
            telemetry.record_response(result)
        return self._require_result(result)

    @staticmethod
    def _require_result(result: str) -> str:
        if not result:
            raise ValueError("Analysis failed - no interpretation generated")
        return result

    async def _prepare_state(self, text: str, user_language: str) -> AnalysisState:
        state = create_initial_state(text, user_language)
        await self._detect(state)
        if state["needs_correction"]:
            await self._correct(state)
        return state

    async def analyze(self, text: str, user_language: str) -> str:
        state = await self._prepare_state(text, user_language)
        return await self._interpret(self._interpretation_messages(state))

    async def analyze_stream(
        self, text: str, user_language: str
    ) -> AsyncIterator[dict[str, str]]:
        state = create_initial_state(text, user_language)

        yield {"event": "stage", "stage": "detect"}
        await self._detect(state)

        if state["needs_correction"]:
            yield {"event": "stage", "stage": "correct"}
            await self._correct(state)

        yield {"event": "stage", "stage": "interpret"}
        messages = self._interpretation_messages(state)
        chunks: list[str] = []
        with track_llm_stage(
            "interpret",
            self.model,
            messages,
        ) as telemetry:
            async for chunk in self.llm_flash.astream(messages):
                delta = self._content_to_text(chunk.content)
                if not delta:
                    continue
                telemetry.record_first_token()
                chunks.append(delta)
                yield {"event": "chunk", "delta": delta}

            result = "".join(chunks).strip()
            if not result:
                fallback = await self.llm_flash.ainvoke(messages)
                result = self._content_to_text(fallback.content).strip()
                if result:
                    telemetry.record_first_token()
                    yield {"event": "chunk", "delta": result}
            telemetry.record_response(result)

        yield {"event": "done", "result": self._require_result(result)}
