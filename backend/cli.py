from __future__ import annotations

import argparse
import json
import sys
from contextlib import contextmanager
from pathlib import Path
from typing import Any, Iterator

from sqlalchemy.orm import Session

from database import SessionLocal, init_db
from schema.analyze_schema import AnalysisRequest, SettingsRequest
from service import get_analysis_service
from use_cases import (
    ABOUT_INFO,
    apply_settings,
    delete_history_item,
    get_history_item_by_id,
    get_history_items,
    read_settings,
    run_analysis,
)

LANG_CHOICES = ("ar", "de", "en", "es", "fr", "it", "ja", "ru", "zh")
MODEL_CHOICES = ("gemini-2.5-flash", "gemini-2.5-pro")


@contextmanager
def db_session() -> Iterator[Session]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def print_json(payload: Any) -> None:
    print(json.dumps(payload, ensure_ascii=False, indent=2))


def read_input_text(text: str | None, file_path: Path | None) -> str:
    if text:
        return text
    if file_path:
        return file_path.read_text(encoding="utf-8")
    raise ValueError("Provide --text or --file")


def cmd_analyze(args: argparse.Namespace) -> int:
    try:
        text = read_input_text(args.text, args.file)
    except (OSError, ValueError) as exc:
        print(f"Input error: {exc}", file=sys.stderr)
        return 1

    service = get_analysis_service()
    request = AnalysisRequest(text=text, user_language=args.lang.upper())

    with db_session() as db:
        response = run_analysis(request, service, db)

    if args.json:
        print_json(response.model_dump())
    elif response.success:
        print(response.result)
    else:
        print(f"Analyze failed: {response.error}", file=sys.stderr)

    return 0 if response.success else 1


def cmd_history_list(args: argparse.Namespace) -> int:
    if args.limit < 0:
        print("--limit must be >= 0", file=sys.stderr)
        return 1

    with db_session() as db:
        response = get_history_items(db)

    if not response.success:
        print(f"History query failed: {response.error}", file=sys.stderr)
        return 1

    items = response.history[: args.limit] if args.limit else response.history
    if args.json:
        print_json([item.model_dump() for item in items])
        return 0

    if not items:
        print("No history records found.")
        return 0

    print("ID   LANG  TIMESTAMP                   PROMPT")
    for item in items:
        prompt = item.prompt.replace("\n", " ").strip()
        preview = f"{prompt[:80]}..." if len(prompt) > 80 else prompt
        print(
            f"{item.id:<4} {item.target_language.upper():<5} "
            f"{item.timestamp:<26} {preview}"
        )
    return 0


def cmd_history_show(args: argparse.Namespace) -> int:
    with db_session() as db:
        item = get_history_item_by_id(args.id, db)

    if not item:
        print(f"History item not found: {args.id}", file=sys.stderr)
        return 1

    if args.json:
        print_json(item.model_dump())
    else:
        print(f"ID: {item.id}")
        print(f"Target Language: {item.target_language.upper()}")
        print(f"Timestamp: {item.timestamp}")
        print("\nPrompt:\n")
        print(item.prompt)
        print("\nResult:\n")
        print(item.result)
    return 0


def cmd_history_delete(args: argparse.Namespace) -> int:
    with db_session() as db:
        deleted = delete_history_item(args.id, db)

    if not deleted:
        print(f"History item not found: {args.id}", file=sys.stderr)
        return 1

    print(f"Deleted history item {args.id}.")
    return 0


def cmd_settings_show(args: argparse.Namespace) -> int:
    service = get_analysis_service()
    response = read_settings(service)

    if args.json:
        print_json(response.model_dump())
    else:
        key_info = "configured" if response.has_api_key else "not configured"
        masked = response.gemini_api_key if response.has_api_key else "-"
        print(f"API Key: {key_info} ({masked})")
        print(f"Model: {response.model}")
    return 0


def cmd_settings_set(args: argparse.Namespace) -> int:
    if not args.api_key and not args.model:
        print("Nothing to update. Provide --api-key and/or --model.", file=sys.stderr)
        return 1

    service = get_analysis_service()
    model = args.model if args.model else service.settings["model"]
    payload = SettingsRequest(gemini_api_key=args.api_key, model=model)
    response = apply_settings(payload, service)

    if args.json:
        print_json(response.model_dump())
    else:
        print("Settings updated.")
        print(f"API Key configured: {response.has_api_key}")
        print(f"Model: {response.model}")
    return 0


def cmd_about(args: argparse.Namespace) -> int:
    if args.json:
        print_json(ABOUT_INFO)
        return 0

    print("LogosAI v1.0")
    print("Deep text analysis engine for advanced language learning.")
    print("Frontend: React, Vite, TailwindCSS, shadcn/ui")
    print("Backend: FastAPI, LangChain/LangGraph, PostgreSQL, Pydantic")
    print("Repo: https://github.com/IvanMiao/LogosAI")
    return 0


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="logosai", description="CLI for all core LogosAI features"
    )
    subparsers = parser.add_subparsers(dest="command", required=True)

    analyze_parser = subparsers.add_parser(
        "analyze", help="Analyze a text and store result in history"
    )
    analyze_input = analyze_parser.add_mutually_exclusive_group(required=True)
    analyze_input.add_argument("--text", help="Text content to analyze")
    analyze_input.add_argument("--file", type=Path, help="Path to a UTF-8 text file")
    analyze_parser.add_argument(
        "--lang",
        default="en",
        choices=LANG_CHOICES,
        help="Output language for analysis",
    )
    analyze_parser.add_argument("--json", action="store_true", help="Output as JSON")
    analyze_parser.set_defaults(handler=cmd_analyze)

    history_parser = subparsers.add_parser("history", help="Manage analysis history")
    history_subparsers = history_parser.add_subparsers(
        dest="history_cmd", required=True
    )

    history_list_parser = history_subparsers.add_parser(
        "list", help="List history items"
    )
    history_list_parser.add_argument(
        "--limit", type=int, default=0, help="Limit number of returned records"
    )
    history_list_parser.add_argument(
        "--json", action="store_true", help="Output as JSON"
    )
    history_list_parser.set_defaults(handler=cmd_history_list)

    history_show_parser = history_subparsers.add_parser(
        "show", help="Show one history item"
    )
    history_show_parser.add_argument("id", type=int, help="History item ID")
    history_show_parser.add_argument(
        "--json", action="store_true", help="Output as JSON"
    )
    history_show_parser.set_defaults(handler=cmd_history_show)

    history_delete_parser = history_subparsers.add_parser(
        "delete", help="Delete one history item"
    )
    history_delete_parser.add_argument("id", type=int, help="History item ID")
    history_delete_parser.set_defaults(handler=cmd_history_delete)

    settings_parser = subparsers.add_parser("settings", help="View or update settings")
    settings_subparsers = settings_parser.add_subparsers(
        dest="settings_cmd", required=True
    )

    settings_show_parser = settings_subparsers.add_parser(
        "show", help="Show current settings"
    )
    settings_show_parser.add_argument(
        "--json", action="store_true", help="Output as JSON"
    )
    settings_show_parser.set_defaults(handler=cmd_settings_show)

    settings_set_parser = settings_subparsers.add_parser(
        "set", help="Update API key and/or model"
    )
    settings_set_parser.add_argument("--api-key", help="Gemini API key")
    settings_set_parser.add_argument("--model", choices=MODEL_CHOICES)
    settings_set_parser.add_argument(
        "--json", action="store_true", help="Output as JSON"
    )
    settings_set_parser.set_defaults(handler=cmd_settings_set)

    about_parser = subparsers.add_parser("about", help="Project information")
    about_parser.add_argument("--json", action="store_true", help="Output as JSON")
    about_parser.set_defaults(handler=cmd_about)
    return parser


def main() -> int:
    parser = build_parser()
    args = parser.parse_args()
    if args.command in {"analyze", "history"}:
        try:
            init_db()
        except Exception as exc:
            print(f"Database initialization failed: {exc}", file=sys.stderr)
            return 1
    return args.handler(args)


if __name__ == "__main__":
    raise SystemExit(main())
