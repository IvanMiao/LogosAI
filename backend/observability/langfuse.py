from typing import Any


class LangfuseObservabilityClient:
    def __init__(self) -> None:
        from langfuse import Langfuse

        self._client = Langfuse()

    def start_trace(self, trace_id: str, metadata: dict[str, Any]) -> None:
        self._client.trace(id=trace_id, name="workspace.action", metadata=metadata)

    def record_span(
        self,
        trace_id: str,
        span_name: str,
        metadata: dict[str, Any] | None = None,
    ) -> None:
        trace = self._client.trace(id=trace_id)
        trace.span(name=span_name, metadata=metadata or {})

    def finish_trace(
        self,
        trace_id: str,
        status: str,
        metadata: dict[str, Any] | None = None,
    ) -> None:
        trace = self._client.trace(id=trace_id)
        trace.update(metadata={"status": status, **(metadata or {})})
