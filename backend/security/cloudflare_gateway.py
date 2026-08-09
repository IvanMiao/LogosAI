"""Authenticate requests forwarded by the Cloudflare Worker.

The check is disabled when ``LOGOSAI_GATEWAY_SECRET`` is unset so local
development and existing tests can call FastAPI directly. Production sets the
secret on both Fly.io and the Worker, making the Worker the only public API
entry point.
"""

import os
import secrets
from typing import Annotated

from fastapi import Header, HTTPException

GATEWAY_SECRET_ENV = "LOGOSAI_GATEWAY_SECRET"


def require_cloudflare_gateway(
    forwarded_secret: Annotated[str | None, Header(alias="X-LogosAI-Gateway")] = None,
) -> None:
    expected_secret = os.getenv(GATEWAY_SECRET_ENV)
    if not expected_secret:
        return

    if not forwarded_secret or not secrets.compare_digest(
        forwarded_secret,
        expected_secret,
    ):
        raise HTTPException(
            status_code=401,
            detail="This API endpoint is available through the LogosAI gateway.",
        )
