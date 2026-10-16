"""`integrations/conformance/http.json`: retries, Retry-After and error mapping."""

from __future__ import annotations

import re
from typing import Any

import pytest
from django.core.mail import EmailMessage

from coss_django import CossError, EmailBackend, __version__

from .conftest import EMAIL, HTTP, MESSAGE, Api

UUID = re.compile(r"^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$")


def minimal_message() -> EmailMessage:
    minimal = MESSAGE["messages"]["minimal"]["input"]
    return EmailMessage(
        subject=minimal["subject"],
        body=minimal["text"],
        from_email=minimal["from"]["address"],
        to=[recipient["address"] for recipient in minimal["to"]],
    )


@pytest.mark.parametrize("scenario", HTTP["scenarios"], ids=lambda scenario: scenario["name"])
def test_http_scenario(scenario: dict[str, Any], api: Api) -> None:
    transport = api.respond(*scenario["responses"], random=scenario.get("random", 0))
    backend = EmailBackend(
        api_key="coss_test_conformance",
        base_url="https://api.coss.test",
        **scenario.get("options", {}),
    )
    message = minimal_message()
    expect = scenario["expect"]

    if expect["outcome"] == "ok":
        assert backend.send_messages([message]) == 1
        assert message.coss_email == HTTP["email"] == EMAIL
    else:
        with pytest.raises(CossError) as raised:
            backend.send_messages([message])
        error = raised.value
        for field, value in expect["error"].items():
            assert getattr(error, field) == value, field
        if "error_message" in expect:
            assert str(error) == expect["error_message"]
        assert not hasattr(message, "coss_email")

    assert len(transport.requests) == expect["attempts"]
    assert api.sleeps_ms == pytest.approx(expect["delays_ms"])
    keys = set()
    for request in transport.requests:
        assert request["url"] == "https://api.coss.test/v1/emails"
        headers = request["headers"]
        for name, value in HTTP["request_headers"].items():
            assert headers[name] == value, name
        assert headers["User-Agent"] == f"coss-django/{__version__}"
        assert UUID.match(headers["Idempotency-Key"])
        keys.add(headers["Idempotency-Key"])
        assert transport.json_body() == MESSAGE["messages"]["minimal"]["body"]
        assert request["timeout"] == 30
    assert len(keys) == 1
