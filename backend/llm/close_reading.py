import re

MAX_ATTEMPTS = 2

_TAG = r"\[\[(OVERVIEW|SYNTHESIS|P\d+)\]{1,2}"
# A tag at the start of a line, tolerating the malformed variants seen in real
# model output: wrapped in backticks or asterisks, a missing closing bracket,
# or commentary continuing on the same line.
_LOOSE_MARKER = re.compile(rf"^[ \t]*[`*]{{0,2}}{_TAG}[`*]{{0,2}}[ \t]*(.*)$", re.M)
_MARKER = re.compile(r"^\[\[(OVERVIEW|SYNTHESIS|P\d+)\]\]$", re.M)


def number_paragraphs(paragraphs: list[str]) -> str:
    return "\n\n".join(
        f"[[P{index}]]\n{paragraph}"
        for index, paragraph in enumerate(paragraphs, start=1)
    )


def normalize_markers(text: str) -> str:
    """Rewrite every recognisable tag as `[[TAG]]` alone on its own line."""

    def rewrite(match: re.Match[str]) -> str:
        rest = match.group(2).strip()
        marker = f"[[{match.group(1)}]]"
        return f"{marker}\n{rest}" if rest else marker

    return _LOOSE_MARKER.sub(rewrite, text)


def find_marker_problem(text: str, paragraph_count: int) -> str | None:
    """Describe how the tags deviate from one block per paragraph, in order."""
    found = _MARKER.findall(text)
    expected = [
        "OVERVIEW",
        *(f"P{index}" for index in range(1, paragraph_count + 1)),
        "SYNTHESIS",
    ]
    if found == expected:
        return None

    missing = [tag for tag in expected if tag not in found]
    if missing:
        return f"missing {', '.join(missing[:5])}"
    repeated = sorted({tag for tag in found if found.count(tag) > 1})
    if repeated:
        return f"repeated {', '.join(repeated[:5])}"
    unknown = [tag for tag in found if tag not in expected]
    if unknown:
        return f"unexpected {', '.join(unknown[:5])}"
    return "tags out of order"


def retry_instruction(problem: str) -> str:
    return (
        f"A previous attempt broke the output structure ({problem}). Write the "
        "lecture again and follow the Output Structure exactly: every tag alone "
        "on its own line, `[[OVERVIEW]]` first, then one block for each "
        "paragraph tag in order, then `[[SYNTHESIS]]`."
    )
