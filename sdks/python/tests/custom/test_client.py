"""The generated client's request behaviour: headers, retries and idempotency keys."""

import json
import pathlib
import typing

import httpx
import pytest

from coss import Coss
from coss.core.api_error import ApiError
from coss.version import __version__

OPENAPI = json.loads((pathlib.Path(__file__).parents[4] / "apps/api/openapi.json").read_text())
EMAIL = OPENAPI["components"]["schemas"]["Email"]["examples"][0]


class Recorder:
    def __init__(self, responses: typing.List[httpx.Response]) -> None:
        self.responses = responses
        self.requests: typing.List[httpx.Request] = []

    def __call__(self, request: httpx.Request) -> httpx.Response:
        self.requests.append(request)
        return self.responses.pop(0)


def client(recorder: Recorder) -> Coss:
    return Coss(
        api_key="coss_test_key",
        base_url="https://api.coss.test",
        httpx_client=httpx.Client(transport=httpx.MockTransport(recorder)),
    )


def error(status: int, type_: str = "api_error") -> httpx.Response:
    body = {"error": {"type": type_, "code": "x", "message": "No.", "request_id": "req_1"}}
    # A millisecond Retry-After keeps the retries fast.
    return httpx.Response(status, json=body, headers={"retry-after-ms": "1"})


def send(coss: Coss) -> typing.Any:
    return coss.email.get("email_01kconformance00000000000")


def test_sends_the_coss_headers() -> None:
    recorder = Recorder([httpx.Response(200, json=EMAIL)])
    send(client(recorder))
    request = recorder.requests[0]
    assert request.url == "https://api.coss.test/v1/emails/email_01kconformance00000000000"
    assert request.headers["coss-version"] == OPENAPI["info"]["version"]
    assert request.headers["authorization"] == "Bearer coss_test_key"
    assert request.headers["user-agent"] == f"coss-python/{__version__}"


def test_retries_a_post_with_one_idempotency_key() -> None:
    recorder = Recorder([error(503), error(409, "idempotency_error"), httpx.Response(202, json=EMAIL)])
    client(recorder).email.send(from_="hello@acme.test", to=["someone@example.com"], subject="Hi", text="Hi")
    keys = {request.headers["idempotency-key"] for request in recorder.requests}
    assert len(recorder.requests) == 3
    assert len(keys) == 1
    assert json.loads(recorder.requests[0].content)["from"] == "hello@acme.test"


def test_keeps_the_callers_idempotency_key() -> None:
    recorder = Recorder([httpx.Response(202, json=EMAIL)])
    client(recorder).email.send(
        from_="hello@acme.test", to=["someone@example.com"], subject="Hi", text="Hi", idempotency_key="order-42"
    )
    assert recorder.requests[0].headers["idempotency-key"] == "order-42"


@pytest.mark.parametrize("status", [400, 402, 404, 422])
def test_never_retries_client_errors(status: int) -> None:
    recorder = Recorder([error(status, "invalid_request_error")])
    with pytest.raises(ApiError) as raised:
        send(client(recorder))
    assert len(recorder.requests) == 1
    assert raised.value.status_code == status


def test_gives_up_after_two_retries() -> None:
    recorder = Recorder([error(500), error(502), error(503)])
    with pytest.raises(ApiError) as raised:
        send(client(recorder))
    assert len(recorder.requests) == 3
    assert raised.value.status_code == 503


def test_never_retries_what_the_api_does_not_deduplicate() -> None:
    recorder = Recorder([error(503)])
    with pytest.raises(ApiError):
        client(recorder).webhook_endpoints.create(url="https://example.com/hooks", event_types=["email.sent"])
    assert len(recorder.requests) == 1
