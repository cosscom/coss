"""A small coss.com API client on `urllib.request` (no third-party dependencies).

It implements the request, retry and error rules every coss.com driver follows
(`integrations/README.md`, mirroring the JavaScript SDK's `packages/sdk/src/core/http.ts`).
"""

from __future__ import annotations

import http.client
import json
import math
import random as _random
import time
import urllib.error
import urllib.request
import uuid
from collections.abc import Callable, Mapping
from datetime import timezone
from email.utils import parsedate_to_datetime
from typing import Any

from coss_django import __version__

__all__ = [
    "API_VERSION",
    "DEFAULT_BASE_URL",
    "CossClient",
    "CossError",
    "Transport",
    "urllib_transport",
]

API_VERSION = "2026-10-10"
DEFAULT_BASE_URL = "https://api.coss.com"
DEFAULT_TIMEOUT = 30.0
DEFAULT_MAX_RETRIES = 2

_INITIAL_RETRY_DELAY_MS = 500
_MAX_RETRY_DELAY_MS = 8_000
# A server asking us to wait longer than this gets its error returned instead of a stalled send.
_MAX_RETRY_AFTER_MS = 60_000

_API_ERROR_TYPES = frozenset(
    {
        "invalid_request_error",
        "authentication_error",
        "permission_error",
        "not_found_error",
        "idempotency_error",
        "rate_limit_error",
        "billing_error",
        "api_error",
    }
)

Headers = Mapping[str, str]
#: Sends one POST: `(url, headers, body, timeout_seconds) -> (status, headers, body)`. It returns
#: every HTTP response (2xx or not) and raises for network errors and timeouts.
Transport = Callable[[str, dict[str, str], bytes, float], tuple[int, Any, bytes | str]]


class CossError(Exception):
    """coss.com refused the email, or couldn't be reached.

    `str(error)` reads `coss.com could not send the email: <message> (<code>)`, followed by the
    validation issues when there are any.
    """

    type: str
    """`invalid_request_error`, `authentication_error`, …, `connection_error` or `timeout_error`."""
    code: str
    """Machine-readable reason, e.g. `domain_not_verified`."""
    message: str
    """The API's (or the client's) own message."""
    status: int | None
    """HTTP status, `None` when there was no response (network errors, timeouts)."""
    request_id: str | None
    """The API request id (`req_…`) to quote to support, when known."""
    param: str | None
    """The request field the error relates to, when the API names one."""
    issues: list[dict[str, str]] | None
    """Field-level problems (`[{"path": …, "message": …}]`), when the API lists them."""

    def __init__(
        self,
        *,
        type: str,
        code: str,
        message: str,
        status: int | None = None,
        request_id: str | None = None,
        param: str | None = None,
        issues: list[dict[str, str]] | None = None,
    ) -> None:
        self.type = type
        self.code = code
        self.message = message
        self.status = status
        self.request_id = request_id
        self.param = param
        self.issues = issues
        text = f"coss.com could not send the email: {message} ({code})"
        if issues:
            text += " " + "; ".join(f"{issue['path']}: {issue['message']}" for issue in issues)
        super().__init__(text)

    def __reduce__(self) -> tuple[Any, ...]:
        # Keyword-only __init__: pickle (e.g. Celery results) needs to rebuild from the fields.
        return (_rebuild_error, (self._fields(),))

    def _fields(self) -> dict[str, Any]:
        return {
            "type": self.type,
            "code": self.code,
            "message": self.message,
            "status": self.status,
            "request_id": self.request_id,
            "param": self.param,
            "issues": self.issues,
        }


def _rebuild_error(fields: dict[str, Any]) -> CossError:
    return CossError(**fields)


class _NoRedirects(urllib.request.HTTPRedirectHandler):
    """Redirects come back as responses: urllib would replay the POST as a GET, maybe elsewhere."""

    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None


_opener = urllib.request.build_opener(_NoRedirects)


def urllib_transport(
    url: str, headers: dict[str, str], body: bytes, timeout: float
) -> tuple[int, Any, bytes]:
    """The default transport: one POST with `urllib.request`."""
    request = urllib.request.Request(url, data=body, headers=headers, method="POST")
    try:
        with _opener.open(request, timeout=timeout) as response:
            return response.status, response.headers, response.read()
    except urllib.error.HTTPError as error:
        with error:
            return error.code, error.headers, error.read()


def backoff_delay_ms(retry: int, random: Callable[[], float] = _random.random) -> float:
    """Exponential backoff (500 ms, 1 s, 2 s … capped at 8 s) minus up to 25% random jitter."""
    delay = min(_INITIAL_RETRY_DELAY_MS * 2**retry, _MAX_RETRY_DELAY_MS)
    return delay * (1 - random() * 0.25)


def parse_retry_after_ms(value: str | None, now: float | None = None) -> float | None:
    """`Retry-After` as milliseconds: delay-seconds or an HTTP date; `None` if absent or invalid."""
    trimmed = value.strip() if value else ""
    if not trimmed:
        return None
    try:
        seconds = float(trimmed)
    except ValueError:
        pass
    else:
        if not math.isfinite(seconds):
            return None
        return seconds * 1000 if seconds >= 0 else None
    try:
        date = parsedate_to_datetime(trimmed)
    except (TypeError, ValueError, IndexError):
        return None
    if date.tzinfo is None:  # "-0000": UTC, origin unknown.
        date = date.replace(tzinfo=timezone.utc)
    current = time.time() if now is None else now
    return max(0.0, (date.timestamp() - current) * 1000)


def is_retryable_status(status: int) -> bool:
    """409 (an idempotent request still in progress), 429 and 5xx are transient."""
    return status == 409 or status == 429 or status >= 500


def _is_timeout(error: BaseException) -> bool:
    # `socket.timeout` is `TimeoutError`.
    if isinstance(error, TimeoutError):
        return True
    return isinstance(error, urllib.error.URLError) and isinstance(error.reason, TimeoutError)


def _describe(error: BaseException) -> str:
    if isinstance(error, urllib.error.URLError) and not isinstance(error, urllib.error.HTTPError):
        reason = error.reason
        if isinstance(reason, BaseException):
            return _describe(reason)
        return str(reason)
    text = str(error)
    return f"{type(error).__name__}: {text}" if text else type(error).__name__


def _lower_headers(headers: Any) -> dict[str, str]:
    if not headers:
        return {}
    items = headers.items() if hasattr(headers, "items") else headers
    return {str(name).lower(): str(value) for name, value in items}


def _error_from_response(status: int, text: str, request_id: str | None) -> CossError:
    try:
        parsed = json.loads(text)
    except ValueError:
        parsed = None
    envelope = parsed.get("error") if isinstance(parsed, dict) else None
    if not isinstance(envelope, dict) or not isinstance(envelope.get("message"), str):
        return CossError(
            type="api_error",
            code="unexpected_response",
            message=f"The coss.com API returned an unexpected HTTP {status} response.",
            status=status,
            request_id=request_id,
        )
    error_type = envelope.get("type")
    code = envelope.get("code")
    envelope_request_id = envelope.get("request_id")
    param = envelope.get("param")
    issues = None
    if isinstance(envelope.get("issues"), list):
        issues = [
            {"path": issue["path"], "message": issue["message"]}
            for issue in envelope["issues"]
            if isinstance(issue, dict)
            and isinstance(issue.get("path"), str)
            and isinstance(issue.get("message"), str)
        ]
    return CossError(
        # Unknown (newer) server types degrade to `api_error`.
        type=error_type if error_type in _API_ERROR_TYPES else "api_error",
        code=code if isinstance(code, str) else "unknown_error",
        message=envelope["message"],
        status=status,
        request_id=envelope_request_id if isinstance(envelope_request_id, str) else request_id,
        param=param if isinstance(param, str) else None,
        issues=issues,
    )


class _Attempt:
    __slots__ = ("email", "error", "retry", "retry_after_ms")

    def __init__(
        self,
        *,
        email: dict[str, Any] | None = None,
        error: CossError | None = None,
        retry: bool = False,
        retry_after_ms: float | None = None,
    ) -> None:
        self.email = email
        self.error = error
        self.retry = retry
        self.retry_after_ms = retry_after_ms


class CossClient:
    """Sends emails with `POST /v1/emails`: auth, JSON, a timeout per attempt and retries.

    `transport`, `sleep` (seconds) and `random` are injectable for tests.
    """

    def __init__(
        self,
        api_key: str,
        *,
        base_url: str | None = None,
        timeout: float | None = None,
        max_retries: int | None = None,
        transport: Transport | None = None,
        sleep: Callable[[float], None] | None = None,
        random: Callable[[], float] | None = None,
        user_agent: str | None = None,
    ) -> None:
        self.api_key = api_key
        self.base_url = (base_url or DEFAULT_BASE_URL).rstrip("/")
        self.timeout = float(DEFAULT_TIMEOUT if timeout is None else timeout)
        self.max_retries = int(DEFAULT_MAX_RETRIES if max_retries is None else max_retries)
        self.user_agent = user_agent or f"coss-django/{__version__}"
        self._transport = transport or urllib_transport
        self._sleep = sleep or time.sleep
        self._random = random or _random.random

    def send_email(
        self, params: Mapping[str, Any], *, idempotency_key: str | None = None
    ) -> dict[str, Any]:
        """Sends one email and returns it as the API did (`{"object": "email", "id": …}`).

        Raises `CossError` when the API refuses it or can't be reached after the retries.
        """
        url = f"{self.base_url}/v1/emails"
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
            "Accept": "application/json",
            "Coss-Version": API_VERSION,
            "User-Agent": self.user_agent,
            # Generated once, outside the retry loop: every attempt is the same request server-side.
            "Idempotency-Key": idempotency_key or str(uuid.uuid4()),
        }
        body = json.dumps(params, ensure_ascii=False).encode("utf-8")
        retry = 0
        while True:
            attempt = self._attempt(url, headers, body)
            if attempt.error is None:
                assert attempt.email is not None
                return attempt.email
            if not attempt.retry or retry >= self.max_retries:
                raise attempt.error
            delay_ms = attempt.retry_after_ms
            if delay_ms is None:
                delay_ms = backoff_delay_ms(retry, self._random)
            if delay_ms > _MAX_RETRY_AFTER_MS:
                raise attempt.error
            self._sleep(delay_ms / 1000)
            retry += 1

    def _attempt(self, url: str, headers: dict[str, str], body: bytes) -> _Attempt:
        try:
            status, response_headers, raw = self._transport(url, dict(headers), body, self.timeout)
        except urllib.error.HTTPError as error:
            # A transport that lets urllib's HTTPError through: it is still a response.
            with error:
                status, response_headers, raw = error.code, error.headers, error.read()
        except (OSError, urllib.error.URLError, http.client.HTTPException) as error:
            if _is_timeout(error):
                timeout = f"{self.timeout:g}"
                return _Attempt(
                    error=CossError(
                        type="timeout_error",
                        code="request_timeout",
                        message=f"The request timed out after {timeout} seconds.",
                    ),
                    retry=True,
                )
            return _Attempt(
                error=CossError(
                    type="connection_error",
                    code="network_error",
                    message=f"Could not reach the coss.com API at {self.base_url}: "
                    f"{_describe(error)}",
                ),
                retry=True,
            )

        lowered = _lower_headers(response_headers)
        request_id = lowered.get("x-request-id")
        text = raw.decode("utf-8", errors="replace") if isinstance(raw, bytes) else str(raw or "")
        if not 200 <= status < 300:
            return _Attempt(
                error=_error_from_response(status, text, request_id),
                retry=is_retryable_status(status),
                retry_after_ms=parse_retry_after_ms(lowered.get("retry-after")),
            )
        try:
            email = json.loads(text)
        except ValueError:
            email = None
        if not isinstance(email, dict):
            return _Attempt(
                error=CossError(
                    type="api_error",
                    code="invalid_response",
                    message=f"The coss.com API returned an HTTP {status} response "
                    "that is not valid JSON.",
                    status=status,
                    request_id=request_id,
                )
            )
        return _Attempt(email=email)
