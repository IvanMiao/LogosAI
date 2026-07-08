import json
from pathlib import Path
from typing import Any

DATASET_PATH = (
    Path(__file__).resolve().parents[2]
    / "docs"
    / "evals"
    / "workspace_alpha.jsonl"
)
REQUIRED_FIELDS = {
    "source_text",
    "anchor_quote",
    "skill",
    "target_language",
    "expected_properties",
    "failure_modes",
}
REQUIRED_SKILLS = {"explain", "close_read"}


def load_samples() -> list[dict[str, Any]]:
    samples: list[dict[str, Any]] = []
    lines = DATASET_PATH.read_text(encoding="utf-8").splitlines()
    for line_number, line in enumerate(lines, start=1):
        if not line.strip():
            continue
        sample = json.loads(line)
        sample["_line_number"] = line_number
        samples.append(sample)
    return samples


def validate_sample(sample: dict[str, Any]) -> list[str]:
    failures: list[str] = []
    missing_fields = REQUIRED_FIELDS - sample.keys()
    if missing_fields:
        failures.append(f"missing fields: {', '.join(sorted(missing_fields))}")

    is_close_read = sample.get("skill") == "close_read"
    anchor_quote = sample.get("anchor_quote")
    source_text = sample.get("source_text", "")
    if not is_close_read and anchor_quote not in source_text:
        failures.append("anchor_quote is not present in source_text")

    for field in ("expected_properties", "failure_modes"):
        value = sample.get(field)
        if not isinstance(value, list) or not value:
            failures.append(f"{field} must be a non-empty list")

    return failures


def run_eval() -> int:
    samples = load_samples()
    failures: list[str] = []
    skills = {sample.get("skill") for sample in samples}

    if len(samples) < 20:
        failures.append(f"expected at least 20 samples, found {len(samples)}")

    missing_skills = REQUIRED_SKILLS - skills
    if missing_skills:
        failures.append(f"missing required skills: {', '.join(sorted(missing_skills))}")

    for sample in samples:
        sample_failures = validate_sample(sample)
        for failure in sample_failures:
            failures.append(f"line {sample['_line_number']}: {failure}")

    if failures:
        print("Workspace Alpha eval baseline: FAIL")
        for failure in failures[:20]:
            print(f"- {failure}")
        return 1

    print("Workspace Alpha eval baseline: PASS")
    print(f"- samples: {len(samples)}")
    print(f"- skills: {', '.join(sorted(str(skill) for skill in skills))}")
    return 0


def main() -> None:
    raise SystemExit(run_eval())


if __name__ == "__main__":
    main()
