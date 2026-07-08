from typing import Any, Protocol


class ObservabilityClient(Protocol):
    def start_trace(self, trace_id: str, metadata: dict[str, Any]) -> None:
        """Record trace creation for one user-visible AI action."""

    def record_span(
        self,
        trace_id: str,
        span_name: str,
        metadata: dict[str, Any] | None = None,
    ) -> None:
        """Record a named span for a trace."""

    def finish_trace(
        self,
        trace_id: str,
        status: str,
        metadata: dict[str, Any] | None = None,
    ) -> None:
        """Record trace completion."""
