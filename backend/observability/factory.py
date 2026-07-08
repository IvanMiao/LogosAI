import os

from observability.client import ObservabilityClient
from observability.langfuse import LangfuseObservabilityClient
from observability.noop import NoopObservabilityClient


def get_observability_client() -> ObservabilityClient:
    provider = os.getenv("LOGOSAI_OBSERVABILITY_PROVIDER", "").lower()
    has_langfuse_keys = bool(
        os.getenv("LANGFUSE_PUBLIC_KEY") and os.getenv("LANGFUSE_SECRET_KEY")
    )

    if provider in {"", "noop"} and not has_langfuse_keys:
        return NoopObservabilityClient()

    if provider in {"", "langfuse"} and has_langfuse_keys:
        try:
            return LangfuseObservabilityClient()
        except Exception:
            return NoopObservabilityClient()

    return NoopObservabilityClient()
