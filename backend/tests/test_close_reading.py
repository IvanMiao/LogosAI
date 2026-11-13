import pytest
from langchain_core.messages import HumanMessage

from llm.close_reading import (
    find_marker_problem,
    normalize_markers,
    number_paragraphs,
)
from tests.helpers import FakeLLMResponse, make_fake_agent

PARAGRAPHS = ["Premier paragraphe.", "Second paragraphe."]
ALIGNED = "[[OVERVIEW]]\nIntro\n\n[[P1]]\nOne\n\n[[P2]]\nTwo\n\n[[SYNTHESIS]]\nEnd"


def use_attempts(agent, attempts: list[str]) -> list[list]:
    """Make the fake model stream one prepared answer per interpretation call."""
    calls: list[list] = []

    async def fake_astream(messages):
        calls.append(messages)
        yield FakeLLMResponse(attempts[len(calls) - 1])

    agent.llm_flash.astream = fake_astream
    return calls


def test_number_paragraphs_tags_each_paragraph_in_order():
    assert number_paragraphs(PARAGRAPHS) == (
        "[[P1]]\nPremier paragraphe.\n\n[[P2]]\nSecond paragraphe."
    )


@pytest.mark.parametrize(
    "malformed",
    [
        # Observed with gemini-2.5-pro and gemini-3.8-flash: one bracket missing.
        ALIGNED.replace("[[P1]]", "[[P1]"),
        # Observed with gemini-2.5-flash: tags wrapped in backticks.
        ALIGNED.replace("[[P2]]", "`[[P2]]`"),
        ALIGNED.replace("[[OVERVIEW]]", "**[[OVERVIEW]]**"),
        ALIGNED.replace("[[P1]]\nOne", "[[P1]] One"),
    ],
)
def test_normalize_markers_repairs_observed_tag_variants(malformed):
    assert normalize_markers(malformed) == ALIGNED


def test_normalize_markers_leaves_untagged_text_alone():
    text = "A plain lecture that mentions `[[P1]]` in passing."
    assert normalize_markers(text) == text


@pytest.mark.parametrize(
    ("text", "problem"),
    [
        (ALIGNED, None),
        (ALIGNED.replace("[[P2]]\nTwo\n\n", ""), "missing P2"),
        (ALIGNED.split("[[SYNTHESIS]]")[0], "missing SYNTHESIS"),
        (ALIGNED.replace("[[P2]]", "[[P1]]\nAgain\n\n[[P2]]"), "repeated P1"),
        (
            ALIGNED.replace("[[SYNTHESIS]]", "[[P3]]\nX\n\n[[SYNTHESIS]]"),
            "unexpected P3",
        ),
        (
            "[[OVERVIEW]]\nI\n\n[[P2]]\nTwo\n\n[[P1]]\nOne\n\n[[SYNTHESIS]]\nEnd",
            "tags out of order",
        ),
        ("A lecture without any tags.", "missing OVERVIEW, P1, P2, SYNTHESIS"),
    ],
)
def test_find_marker_problem(text, problem):
    assert find_marker_problem(text, len(PARAGRAPHS)) == problem


async def test_stream_sends_numbered_paragraphs_and_skips_correction():
    agent = make_fake_agent(needs_correction=True)
    calls = use_attempts(agent, [ALIGNED])

    events = [
        event async for event in agent.analyze_stream("ignored", "ZH", PARAGRAPHS)
    ]

    assert [e["stage"] for e in events if e["event"] == "stage"] == [
        "detect",
        "interpret",
    ]
    agent.llm_lite.ainvoke.assert_not_awaited()
    system, human = calls[0]
    assert "learned critic with a cool passion" in system.content
    assert "[PROF_LANGUAGE]" not in system.content
    assert human.content == number_paragraphs(PARAGRAPHS)
    assert events[-1] == {"event": "done", "result": ALIGNED}


async def test_stream_repairs_tags_without_retrying():
    agent = make_fake_agent()
    calls = use_attempts(agent, [ALIGNED.replace("[[P1]]", "[[P1]")])

    events = [
        event async for event in agent.analyze_stream("ignored", "ZH", PARAGRAPHS)
    ]

    assert len(calls) == 1
    assert events[-1] == {"event": "done", "result": ALIGNED}


async def test_stream_retries_once_when_a_paragraph_is_missing():
    agent = make_fake_agent()
    calls = use_attempts(agent, [ALIGNED.replace("[[P2]]\nTwo\n\n", ""), ALIGNED])

    events = [
        event async for event in agent.analyze_stream("ignored", "ZH", PARAGRAPHS)
    ]

    assert [e["stage"] for e in events if e["event"] == "stage"] == [
        "detect",
        "interpret",
        "retry",
    ]
    assert isinstance(calls[1][-1], HumanMessage)
    assert "missing P2" in calls[1][-1].content
    assert events[-1] == {"event": "done", "result": ALIGNED}


async def test_stream_returns_second_attempt_even_if_still_misaligned():
    agent = make_fake_agent()
    calls = use_attempts(agent, ["no tags", "still no tags", "never requested"])

    events = [
        event async for event in agent.analyze_stream("ignored", "ZH", PARAGRAPHS)
    ]

    assert len(calls) == 2
    assert events[-1] == {"event": "done", "result": "still no tags"}


async def test_sync_analysis_retries_misaligned_close_reading():
    agent = make_fake_agent()
    agent.llm_flash.ainvoke.side_effect = [
        FakeLLMResponse("no tags"),
        FakeLLMResponse(ALIGNED),
    ]

    assert await agent.analyze("ignored", "ZH", PARAGRAPHS) == ALIGNED
    assert agent.llm_flash.ainvoke.await_count == 2


def test_stream_endpoint_forwards_paragraphs(client, fake_agent):
    calls = use_attempts(fake_agent, [ALIGNED])

    response = client.post(
        "/api/analyze/stream",
        json={"text": "ignored", "user_language": "ZH", "paragraphs": PARAGRAPHS},
    )

    assert response.status_code == 200
    assert calls[0][1].content == number_paragraphs(PARAGRAPHS)
    assert '"result": "[[OVERVIEW]]' in response.text
