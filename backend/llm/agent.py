from collections.abc import AsyncIterator

from langchain_core.messages import BaseMessage, HumanMessage, SystemMessage
from langchain_google_genai import ChatGoogleGenerativeAI

from llm.close_reading import (
    MAX_ATTEMPTS,
    find_marker_problem,
    normalize_markers,
    number_paragraphs,
    retry_instruction,
)
from llm.prompts import CORRECTION_SYS_PROMPT, EXAM_SYS_PROMPT
from llm.state import (
    AnalysisState,
    build_analysis_prompt,
    build_close_reading_prompt,
    create_initial_state,
)
from monitoring.llm import track_llm_stage
from schemas.analyze import TextDirectives

_GEMINI_4_OUTPUT_TOKENS = {"gemini-4-argon": 32768, "gemini-4-hydrogen": 65536}


class TextAnalysisLangchain:
    def __init__(self, gemini_key: str | None, model: str = "gemini-2.5-flash"):
        if not gemini_key:
            raise ValueError("Gemini API key is required.")

        self.model = model
        self.lite_model = "gemini-2.5-flash-lite"
        if model in _GEMINI_4_OUTPUT_TOKENS:
            # Clear LangChain's default temperature to use Gemini 4 sampling defaults.
            self.llm_flash = ChatGoogleGenerativeAI(
                model=model,
                api_key=gemini_key,
                max_output_tokens=_GEMINI_4_OUTPUT_TOKENS[model],
                timeout=1200,
            ).bind(generation_config={"temperature": None})
        else:
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
    def _interpretation_messages(
        state: AnalysisState, paragraphs: list[str] | None = None
    ) -> list[BaseMessage]:
        languages = (state["text_language"], state["user_language"])
        if paragraphs:
            return [
                SystemMessage(build_close_reading_prompt(*languages)),
                HumanMessage(number_paragraphs(paragraphs)),
            ]
        return [
            SystemMessage(build_analysis_prompt(*languages)),
            HumanMessage(state["text"]),
        ]

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

    async def _prepare_state(
        self, text: str, user_language: str, paragraphs: list[str] | None
    ) -> AnalysisState:
        state = create_initial_state(text, user_language)
        await self._detect(state)
        # Paragraph-aligned readings quote the source verbatim, so the text the
        # reader sees must not be rewritten.
        if state["needs_correction"] and not paragraphs:
            await self._correct(state)
        return state

    async def analyze(
        self, text: str, user_language: str, paragraphs: list[str] | None = None
    ) -> str:
        state = await self._prepare_state(text, user_language, paragraphs)
        messages = self._interpretation_messages(state, paragraphs)
        result = await self._interpret(messages)
        if not paragraphs:
            return result

        result = normalize_markers(result)
        for _ in range(MAX_ATTEMPTS - 1):
            problem = find_marker_problem(result, len(paragraphs))
            if not problem:
                break
            retry = [*messages, HumanMessage(retry_instruction(problem))]
            result = normalize_markers(await self._interpret(retry))
        return result

    async def _stream_interpretation(
        self, messages: list[BaseMessage], chunks: list[str]
    ) -> AsyncIterator[dict[str, str]]:
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

            if not "".join(chunks).strip():
                fallback = await self.llm_flash.ainvoke(messages)
                result = self._content_to_text(fallback.content).strip()
                if result:
                    telemetry.record_first_token()
                    chunks.append(result)
                    yield {"event": "chunk", "delta": result}
            telemetry.record_response("".join(chunks).strip())

    async def analyze_stream(
        self, text: str, user_language: str, paragraphs: list[str] | None = None
    ) -> AsyncIterator[dict[str, str]]:
        state = create_initial_state(text, user_language)

        yield {"event": "stage", "stage": "detect"}
        await self._detect(state)

        if state["needs_correction"] and not paragraphs:
            yield {"event": "stage", "stage": "correct"}
            await self._correct(state)

        yield {"event": "stage", "stage": "interpret"}
        messages = self._interpretation_messages(state, paragraphs)
        chunks: list[str] = []
        async for event in self._stream_interpretation(messages, chunks):
            yield event
        result = self._require_result("".join(chunks).strip())

        if paragraphs:
            result = normalize_markers(result)
            for _ in range(MAX_ATTEMPTS - 1):
                problem = find_marker_problem(result, len(paragraphs))
                if not problem:
                    break
                # The client discards the streamed text when it sees this stage.
                yield {"event": "stage", "stage": "retry"}
                retry = [*messages, HumanMessage(retry_instruction(problem))]
                chunks = []
                async for event in self._stream_interpretation(retry, chunks):
                    yield event
                result = normalize_markers(
                    self._require_result("".join(chunks).strip())
                )

        yield {"event": "done", "result": result}
