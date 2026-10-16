"""End to end against the API's test app.

    bun run --cwd apps/api serve:test  # prints {base_url, sandbox_key, live_key, live_from}
    COSS_E2E='<that JSON>' uv run pytest tests/test_e2e.py

Skipped without `COSS_E2E`.
"""

from __future__ import annotations

import json
import os
import time
import urllib.request
import uuid
import warnings
from email.mime.image import MIMEImage
from typing import Any

import pytest
from django.core.mail import EmailMultiAlternatives

from coss_django import CossError, EmailBackend
from coss_django.client import API_VERSION

E2E = os.environ.get("COSS_E2E")
pytestmark = pytest.mark.skipif(not E2E, reason="COSS_E2E is not set (see the module docstring)")


@pytest.fixture
def server() -> dict[str, str]:
    assert E2E
    return json.loads(E2E)


def get_email(server: dict[str, str], key: str, email_id: str) -> dict[str, Any]:
    request = urllib.request.Request(
        f"{server['base_url']}/v1/emails/{email_id}",
        headers={
            "Authorization": f"Bearer {key}",
            "Accept": "application/json",
            "Coss-Version": API_VERSION,
        },
    )
    with urllib.request.urlopen(request, timeout=10) as response:
        return json.loads(response.read())


def wait_until_sent(server: dict[str, str], key: str, email_id: str) -> dict[str, Any]:
    deadline = time.monotonic() + 10
    while True:
        email = get_email(server, key, email_id)
        if email["status"] == "sent" or time.monotonic() > deadline:
            return email
        time.sleep(0.2)


def receipt(from_email: str) -> EmailMultiAlternatives:
    message = EmailMultiAlternatives(
        subject="Your receipt ✓",
        body="Thanks for your order!",
        from_email=from_email,
        to=["Ada Lovelace <ada@example.com>"],
        cc=["carol@example.com"],
        reply_to=["support@example.com"],
        headers={"X-Campaign": "spring", "X-Greeting": "Grüße", "Message-ID": "<x@y>"},
    )
    message.attach_alternative('<p>Thanks! <img src="cid:logo@acme"></p>', "text/html")
    message.attach("receipt.pdf", b"%PDF-1.4\n", "application/pdf")
    logo = MIMEImage(b"\x89PNG\r\n\x1a\n", "png")
    logo.add_header("Content-Disposition", "inline", filename="logo.png")
    logo.add_header("Content-ID", "<logo@acme>")
    with warnings.catch_warnings():
        # Django 6.0+ deprecates MIMEBase attachments in favour of MIMEPart.
        warnings.simplefilter("ignore", DeprecationWarning)
        warnings.simplefilter("ignore", PendingDeprecationWarning)
        message.attach(logo)
    message.coss = {
        "category": "receipts",
        "tags": {"plan": "pro", "order": "42"},
        "idempotency_key": f"e2e-{uuid.uuid4()}",
    }
    return message


@pytest.mark.parametrize("key_name", ["live_key", "sandbox_key"])
def test_send(server: dict[str, str], key_name: str) -> None:
    key = server[key_name]
    backend = EmailBackend(api_key=key, base_url=server["base_url"])
    message = receipt(server["live_from"])

    assert backend.send_messages([message]) == 1
    email_id = message.coss_email["id"]
    assert email_id.startswith("email_")

    email = wait_until_sent(server, key, email_id)
    assert email["status"] == "sent"
    assert email["sandbox"] is (key_name == "sandbox_key")
    assert email["from"] == server["live_from"]
    assert email["to"] == ["Ada Lovelace <ada@example.com>"]
    assert email["cc"] == ["carol@example.com"]
    assert email["reply_to"] == ["support@example.com"]
    assert email["subject"] == "Your receipt ✓"
    assert email["text"] == "Thanks for your order!"
    assert email["html"] == '<p>Thanks! <img src="cid:logo@acme"></p>'
    assert email["category"] == "receipts"
    assert email["tags"] == [{"name": "plan", "value": "pro"}, {"name": "order", "value": "42"}]
    assert email["headers"] == {"x-campaign": "spring", "x-greeting": "=?UTF-8?B?R3LDvMOfZQ==?="}
    attachments = [
        {key: attachment[key] for key in ("filename", "content_type", "content_id", "size")}
        for attachment in email["attachments"]
    ]
    assert attachments == [
        {
            "filename": "receipt.pdf",
            "content_type": "application/pdf",
            "content_id": None,
            "size": 9,
        },
        {"filename": "logo.png", "content_type": "image/png", "content_id": "logo@acme", "size": 8},
    ]

    # The same idempotency key replays the email instead of sending it again.
    again = receipt(server["live_from"])
    again.coss = message.coss
    assert backend.send_messages([again]) == 1
    assert again.coss_email["id"] == email_id


def test_an_unverified_domain_is_refused(server: dict[str, str]) -> None:
    backend = EmailBackend(api_key=server["live_key"], base_url=server["base_url"])
    message = EmailMultiAlternatives(
        "Hello", "Hi", "hello@unverified-domain.example", ["ada@example.com"]
    )
    with pytest.raises(CossError) as raised:
        backend.send_messages([message])
    assert raised.value.code == "domain_not_verified"
    assert raised.value.status is not None and 400 <= raised.value.status < 500
    assert raised.value.request_id and raised.value.request_id.startswith("req_")
    assert str(raised.value).startswith("coss.com could not send the email: ")
