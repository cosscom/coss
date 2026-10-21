"""Verifies coss.com webhook and log drain requests (Standard Webhooks signatures).

Hand-written (listed in .fernignore); mirrors the TypeScript SDK's ``verifyWebhook`` and
``verifyLogDrainBatch``.
"""

from __future__ import annotations

import base64
import binascii
import datetime as dt
import hashlib
import hmac
import json
import re
import typing

__all__ = ["WebhookVerificationError", "verify_log_drain_batch", "verify_webhook"]

SECRET_PREFIX = "whsec_"
DEFAULT_TOLERANCE_SECONDS = 300

Headers = typing.Mapping[str, typing.Union[str, typing.Sequence[str], None]]


class WebhookVerificationError(Exception):
    """A webhook request failed verification: reject it (e.g. respond 400)."""


def verify_webhook(
    payload: typing.Union[str, bytes],
    headers: Headers,
    secret: str,
    *,
    tolerance_seconds: int = DEFAULT_TOLERANCE_SECONDS,
    now: typing.Optional[dt.datetime] = None,
) -> typing.Any:
    """Checks the request's signature and age, then returns the parsed event.

    Pass the raw request body exactly as received (not re-serialized JSON), the request headers
    and the endpoint's ``whsec_…`` signing secret. Raises ``WebhookVerificationError`` when the
    request must be rejected. The same check verifies messages your own users receive from
    coss.com Hooks: pass that endpoint's secret.
    """
    body = _verify_signature(payload, headers, secret, tolerance_seconds, now)
    try:
        return json.loads(body)
    except ValueError:  # Including bytes that aren't UTF-8.
        raise WebhookVerificationError("The webhook body is not valid JSON.") from None


def verify_log_drain_batch(
    payload: typing.Union[str, bytes],
    headers: Headers,
    secret: str,
    *,
    tolerance_seconds: int = DEFAULT_TOLERANCE_SECONDS,
    now: typing.Optional[dt.datetime] = None,
) -> typing.List[typing.Any]:
    """Checks a log drain request's signature and age, then returns its lines.

    The body is NDJSON: one log line or audit event per line. The ``webhook-id`` header is the
    batch id, the same on every retry of a batch: use it (or each line's ``id``) to skip a batch
    you already stored. Raises ``WebhookVerificationError`` when the request must be rejected.
    """
    body = _verify_signature(payload, headers, secret, tolerance_seconds, now)
    try:
        return [json.loads(line) for line in body.decode("utf-8").split("\n") if line]
    except ValueError:  # Including bytes that aren't UTF-8.
        raise WebhookVerificationError("The log drain body is not valid NDJSON.") from None


def _header(headers: Headers, name: str) -> typing.Optional[str]:
    for key, value in headers.items():
        if key.lower() != name:
            continue
        if isinstance(value, (list, tuple)):
            value = value[0] if value else None
        return value if isinstance(value, str) else None
    return None


def _decode_base64(value: str) -> typing.Optional[bytes]:
    try:
        return base64.b64decode(value, validate=True)
    except (binascii.Error, ValueError):
        return None


def _verify_signature(
    payload: typing.Union[str, bytes],
    headers: Headers,
    secret: str,
    tolerance_seconds: int,
    now: typing.Optional[dt.datetime],
) -> bytes:
    # The signature covers the raw bytes, so they're only decoded once it matched.
    body = payload if isinstance(payload, bytes) else payload.encode("utf-8")
    message_id = _header(headers, "webhook-id")
    timestamp = _header(headers, "webhook-timestamp")
    signatures = _header(headers, "webhook-signature")
    if not message_id or not timestamp or not signatures:
        raise WebhookVerificationError("Missing webhook-id, webhook-timestamp or webhook-signature.")

    current = int((now or dt.datetime.now(dt.timezone.utc)).timestamp())
    if not re.fullmatch(r"[0-9]+", timestamp) or abs(current - int(timestamp)) > tolerance_seconds:
        raise WebhookVerificationError("The webhook timestamp is too old or in the future.")

    key = _decode_base64(secret[len(SECRET_PREFIX) :] if secret.startswith(SECRET_PREFIX) else secret)
    if not key:
        raise WebhookVerificationError("The signing secret is not a valid whsec_… secret.")

    signed = f"{message_id}.{timestamp}.".encode() + body
    expected = hmac.new(key, signed, hashlib.sha256).digest()
    # Several space-separated signatures are sent while a secret is being rotated.
    for candidate in signatures.split(" "):
        version, _, value = candidate.partition(",")
        if version != "v1" or not value:
            continue
        signature = _decode_base64(value)
        if signature is not None and hmac.compare_digest(signature, expected):
            return body
    raise WebhookVerificationError("No webhook signature matches.")
