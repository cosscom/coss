from __future__ import annotations

import json
from pathlib import Path
from typing import Any
from urllib.error import URLError

import pytest

from coss_django import backend as backend_module
from coss_django.client import CossClient

CONFORMANCE = Path(__file__).resolve().parents[2] / "conformance"
HTTP = json.loads((CONFORMANCE / "http.json").read_text(encoding="utf-8"))
MESSAGE = json.loads((CONFORMANCE / "message.json").read_text(encoding="utf-8"))

EMAIL = {"object": "email", "id": "email_01k0000000000000000000000", "status": "queued"}


class FakeTransport:
    """Answers each attempt with the next scripted response and records the requests."""

    def __init__(self, responses: list[dict[str, Any]] | None = None) -> None:
        # None: every attempt gets a 202 with the email.
        self.responses = None if responses is None else list(responses)
        self.requests: list[dict[str, Any]] = []

    def __call__(
        self, url: str, headers: dict[str, str], body: bytes, timeout: float
    ) -> tuple[int, dict[str, str], bytes]:
        self.requests.append({"url": url, "headers": headers, "body": body, "timeout": timeout})
        if self.responses is None:
            response: dict[str, Any] = {"status": 202, "body": "@email"}
        elif self.responses:
            response = self.responses.pop(0)
        else:
            raise AssertionError("more attempts than scripted responses")
        if response.get("network_error"):
            raise URLError(ConnectionRefusedError(111, "Connection refused"))
        if response.get("timeout"):
            raise TimeoutError("timed out")
        body_value = response.get("body", EMAIL)
        if body_value == "@email":
            body_value = EMAIL
        raw = body_value if isinstance(body_value, str) else json.dumps(body_value)
        return response.get("status", 202), dict(response.get("headers", {})), raw.encode("utf-8")

    def json_body(self, index: int = -1) -> dict[str, Any]:
        return json.loads(self.requests[index]["body"].decode("utf-8"))


class Api:
    """The fake coss.com API every backend in a test talks to."""

    def __init__(self) -> None:
        self.transport = FakeTransport()
        self.sleeps_ms: list[float] = []
        self.random = 0.0

    def respond(self, *responses: dict[str, Any], random: float = 0.0) -> FakeTransport:
        self.transport = FakeTransport(list(responses))
        self.random = random
        return self.transport

    def client(self, *args: Any, **kwargs: Any) -> CossClient:
        return CossClient(
            *args,
            transport=lambda *call: self.transport(*call),
            sleep=lambda seconds: self.sleeps_ms.append(seconds * 1000),
            random=lambda: self.random,
            **kwargs,
        )


@pytest.fixture(autouse=True)
def coss_backend(settings: Any, monkeypatch: pytest.MonkeyPatch) -> None:
    # pytest-django switches to the locmem backend; these tests are about ours.
    settings.EMAIL_BACKEND = "coss_django.EmailBackend"
    settings.COSS_API_KEY = "coss_test_settings"
    monkeypatch.delenv("COSS_API_KEY", raising=False)


@pytest.fixture
def api(monkeypatch: pytest.MonkeyPatch) -> Api:
    """Routes every backend's client through a fake transport (sleeps recorded, not waited)."""
    fake = Api()
    monkeypatch.setattr(backend_module, "CossClient", fake.client)
    return fake
