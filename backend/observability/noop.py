from typing import Any


class NoopObservabilityClient:
    def start_trace(self, trace_id: str, metadata: dict[str, Any]) -> None:
        return None

    def record_span(
        self,
        trace_id: str,
        span_name: str,
        metadata: dict[str, Any] | None = None,
    ) -> None:
        return None

    def finish_trace(
        self,
        trace_id: str,
        status: str,
        metadata: dict[str, Any] | None = None,
    ) -> None:
        return None
