from dataclasses import dataclass
from unittest.mock import AsyncMock, MagicMock

from workflow.agent import TextAnalysisLangchain


@dataclass
class FakeLLMResponse:
    content: str


def make_fake_agent(
    *,
    language: str = "FR",
    genre: str = "news",
    needs_correction: bool = False,
    corrected_text: str = "corrected",
    chunks: list[str] | None = None,
) -> TextAnalysisLangchain:
    """Build a TextAnalysisLangchain with fully mocked LLMs."""
    if chunks is None:
        chunks = ["Hello", " world"]

    agent = object.__new__(TextAnalysisLangchain)

    # --- llm_lite: detection (structured output) + correction ---
    structured_mock = AsyncMock()
    structured_mock.ainvoke.return_value = MagicMock(
        language=language,
        genre=genre,
        correction_needed=needs_correction,
    )

    lite_mock = MagicMock()
    lite_mock.with_structured_output.return_value = structured_mock
    lite_mock.ainvoke = AsyncMock(return_value=FakeLLMResponse(corrected_text))

    # --- llm_flash: interpretation streaming ---
    async def fake_astream(_messages):
        for text in chunks:
            yield FakeLLMResponse(text)

    flash_mock = MagicMock()
    flash_mock.astream = fake_astream
    flash_mock.ainvoke = AsyncMock(
        return_value=FakeLLMResponse("".join(chunks)),
    )

    agent.llm_lite = lite_mock
    agent.llm_flash = flash_mock
    agent.graph = MagicMock()

    return agent
