"""`integrations/conformance/message.json`: how a Django message becomes the request body."""

from __future__ import annotations

import base64
import warnings
from email.mime.image import MIMEImage
from typing import Any

import pytest
from django.core.mail import EmailMultiAlternatives

from coss_django import EmailBackend
from coss_django.mime import custom_headers, encode_header_value, format_address, media_type

from .conftest import MESSAGE, Api


def django_address(entry: dict[str, Any]) -> str:
    """How a Django app writes an address: `addr`, or `"Name" <addr>`."""
    name = entry.get("name")
    if not name:
        return entry["address"]
    escaped = name.replace("\\", "\\\\").replace('"', '\\"')
    return f'"{escaped}" <{entry["address"]}>'


def build_message(spec: dict[str, Any]) -> EmailMultiAlternatives:
    message = EmailMultiAlternatives(
        subject=spec["subject"],
        body=spec.get("text", ""),
        from_email=django_address(spec["from"]),
        to=[django_address(entry) for entry in spec.get("to", [])],
        cc=[django_address(entry) for entry in spec.get("cc", [])],
        bcc=[django_address(entry) for entry in spec.get("bcc", [])],
        reply_to=[django_address(entry) for entry in spec.get("reply_to", [])],
        headers=dict(spec.get("headers", {})),
    )
    if "html" in spec:
        message.attach_alternative(spec["html"], "text/html")
    for attachment in spec.get("attachments", []):
        content = base64.b64decode(attachment["content_base64"])
        if attachment.get("inline"):
            subtype = attachment["content_type"].split("/", 1)[1]
            image = MIMEImage(content, subtype)
            image.add_header("Content-Disposition", "inline", filename=attachment["filename"])
            image.add_header("Content-ID", f"<{attachment['content_id']}>")
            with warnings.catch_warnings():
                # Django 6.0+ deprecates MIMEBase attachments in favour of MIMEPart.
                warnings.simplefilter("ignore", DeprecationWarning)
                warnings.simplefilter("ignore", PendingDeprecationWarning)
                message.attach(image)
        else:
            message.attach(attachment["filename"], content, attachment["content_type"])
    if "coss" in spec:
        message.coss = spec["coss"]
    return message


def lower_headers(body: dict[str, Any]) -> dict[str, Any]:
    if "headers" in body:
        body = {**body, "headers": {name.lower(): value for name, value in body["headers"].items()}}
    return body


@pytest.mark.parametrize("name", sorted(MESSAGE["messages"]))
def test_message(name: str, api: Api) -> None:
    case = MESSAGE["messages"][name]
    message = build_message(case["input"])

    assert EmailBackend().send_messages([message]) == 1

    assert lower_headers(api.transport.json_body()) == lower_headers(case["body"])
    if "idempotency_key" in case:
        assert api.transport.requests[0]["headers"]["Idempotency-Key"] == case["idempotency_key"]


@pytest.mark.parametrize(
    "case", MESSAGE["header_values"], ids=lambda case: repr(case["value"])[:40]
)
def test_header_value(case: dict[str, Any]) -> None:
    assert (encode_header_value(case["value"]) or None) == case["sent"]
    sent = custom_headers([("X-Test", case["value"])])
    assert sent == (None if case["sent"] is None else {"X-Test": case["sent"]})


@pytest.mark.parametrize("case", MESSAGE["addresses"], ids=lambda case: repr(case["name"]))
def test_address(case: dict[str, Any]) -> None:
    assert format_address(case["address"], case["name"]) == case["formatted"]


@pytest.mark.parametrize("case", MESSAGE["addresses"], ids=lambda case: repr(case["name"]))
def test_address_through_django(case: dict[str, Any], api: Api) -> None:
    """The same names, written the way Django apps write them, come out the same."""
    to = django_address({"address": case["address"], "name": (case["name"] or "").strip()})
    EmailMultiAlternatives("Hi", "Hi", "hello@acme.test", [to]).send()
    assert api.transport.json_body()["to"] == [case["formatted"]]


@pytest.mark.parametrize("case", MESSAGE["media_types"], ids=lambda case: repr(case["given"]))
def test_media_type(case: dict[str, Any]) -> None:
    assert media_type(case["given"]) == case["sent"]


@pytest.mark.parametrize("name", MESSAGE["reserved_headers"])
def test_reserved_header_is_dropped(name: str) -> None:
    assert custom_headers([(name, "value")]) is None
    assert custom_headers([(name.lower(), "value"), ("X-Kept", "yes")]) == {"X-Kept": "yes"}
