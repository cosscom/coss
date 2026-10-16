"""The default `urllib` transport against a local HTTP server."""

from __future__ import annotations

import json
import socket
import threading
import time
from collections.abc import Iterator
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from typing import Any

import pytest

from coss_django import CossError
from coss_django.client import CossClient


class Handler(BaseHTTPRequestHandler):
    requests: list[dict[str, Any]] = []

    def do_POST(self) -> None:
        length = int(self.headers.get("Content-Length", "0"))
        body = self.rfile.read(length)
        Handler.requests.append({"path": self.path, "headers": dict(self.headers), "body": body})
        params = json.loads(body)
        if params["subject"] == "slow":
            time.sleep(0.5)
        if params["subject"] == "redirect":
            self.send_response(307)
            self.send_header("Location", "https://elsewhere.example/v1/emails")
            self.send_header("Content-Length", "0")
            self.end_headers()
            return
        if params["subject"] == "invalid":
            error = {
                "type": "invalid_request_error",
                "code": "validation_failed",
                "message": "Invalid request.",
                "param": "to",
                "request_id": "req_1",
            }
            self.reply(422, {"error": error})
            return
        self.reply(202, {"object": "email", "id": "email_1", "status": "queued"})

    def reply(self, status: int, payload: dict[str, Any]) -> None:
        data = json.dumps(payload).encode()
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(data)))
        self.send_header("X-Request-Id", "req_header")
        self.end_headers()
        self.wfile.write(data)

    def log_message(self, format: str, *args: Any) -> None:
        pass


@pytest.fixture
def base_url() -> Iterator[str]:
    Handler.requests = []
    server = ThreadingHTTPServer(("127.0.0.1", 0), Handler)
    thread = threading.Thread(target=server.serve_forever, args=(0.05,), daemon=True)
    thread.start()
    yield f"http://127.0.0.1:{server.server_address[1]}/"
    server.shutdown()
    server.server_close()


def params(subject: str) -> dict[str, Any]:
    return {"from": "hello@acme.test", "to": ["zoë@example.com"], "subject": subject}


def test_a_send(base_url: str) -> None:
    client = CossClient("coss_test_x", base_url=base_url)
    email = client.send_email(params("Grüße"), idempotency_key="key-1")
    assert email == {"object": "email", "id": "email_1", "status": "queued"}
    request = Handler.requests[0]
    assert request["path"] == "/v1/emails"
    headers = {name.lower(): value for name, value in request["headers"].items()}
    assert headers["authorization"] == "Bearer coss_test_x"
    assert headers["content-type"] == "application/json"
    assert headers["accept"] == "application/json"
    assert headers["coss-version"] == "2026-10-10"
    assert headers["idempotency-key"] == "key-1"
    assert headers["user-agent"].startswith("coss-django/")
    assert request["body"] == json.dumps(params("Grüße"), ensure_ascii=False).encode("utf-8")


def test_an_error_response(base_url: str) -> None:
    with pytest.raises(CossError) as raised:
        CossClient("coss_test_x", base_url=base_url).send_email(params("invalid"))
    error = raised.value
    assert (error.type, error.code, error.status, error.param, error.request_id) == (
        "invalid_request_error",
        "validation_failed",
        422,
        "to",
        "req_1",
    )


def test_redirects_are_not_followed(base_url: str) -> None:
    with pytest.raises(CossError) as raised:
        CossClient("coss_test_x", base_url=base_url).send_email(params("redirect"))
    assert (raised.value.code, raised.value.status) == ("unexpected_response", 307)
    assert len(Handler.requests) == 1


def test_a_refused_connection_is_a_network_error() -> None:
    with socket.socket() as probe:
        probe.bind(("127.0.0.1", 0))
        port = probe.getsockname()[1]
    client = CossClient("coss_test_x", base_url=f"http://127.0.0.1:{port}", max_retries=0)
    with pytest.raises(CossError) as raised:
        client.send_email(params("hi"))
    assert (raised.value.type, raised.value.code) == ("connection_error", "network_error")
    assert raised.value.status is None and raised.value.request_id is None


def test_a_slow_response_is_a_timeout(base_url: str) -> None:
    client = CossClient("coss_test_x", base_url=base_url, timeout=0.1, max_retries=0)
    with pytest.raises(CossError) as raised:
        client.send_email(params("slow"))
    assert (raised.value.type, raised.value.code) == ("timeout_error", "request_timeout")
    assert raised.value.status is None
