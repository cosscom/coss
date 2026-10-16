"""The backend through Django's own mail API."""

from __future__ import annotations

import pickle
import warnings
from datetime import datetime, timedelta
from datetime import timezone as dt_timezone
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.utils import formataddr
from typing import Any
from zoneinfo import ZoneInfo

import django
import pytest
from django.core import mail
from django.core.exceptions import ImproperlyConfigured
from django.core.mail import EmailMessage, EmailMultiAlternatives
from django.test import override_settings
from django.utils import timezone
from django.utils.functional import lazy

from coss_django import CossError, EmailBackend

from .conftest import EMAIL, Api

DJANGO_6 = django.VERSION >= (6, 0)
DJANGO_6_1 = django.VERSION >= (6, 1)

UNAUTHORIZED = {
    "status": 401,
    "body": {
        "error": {
            "type": "authentication_error",
            "code": "invalid_api_key",
            "message": "Invalid API key.",
            "request_id": "req_1",
        }
    },
}
OK = {"status": 202, "body": "@email"}


def quietly(function: Any, *args: Any, **kwargs: Any) -> Any:
    """Calls a Django API that Django 6.1 deprecates (get_connection, fail_silently, …)."""
    with warnings.catch_warnings():
        warnings.simplefilter("ignore", DeprecationWarning)
        warnings.simplefilter("ignore", PendingDeprecationWarning)
        return function(*args, **kwargs)


def message(**kwargs: Any) -> EmailMultiAlternatives:
    fields = {"subject": "Hello", "body": "Hi Ada", "to": ["ada@example.com"]} | kwargs
    return EmailMultiAlternatives(**fields)


def body(api: Api, index: int = -1) -> dict[str, Any]:
    return api.transport.json_body(index)


# Django's helpers -------------------------------------------------------------------------------


def test_send_mail(api: Api) -> None:
    sent = mail.send_mail(
        "Hello", "Hi Ada", None, ["ada@example.com"], html_message="<p>Hi Ada</p>"
    )
    assert sent == 1
    assert body(api) == {
        "from": "hello@acme.test",
        "to": ["ada@example.com"],
        "subject": "Hello",
        "html": "<p>Hi Ada</p>",
        "text": "Hi Ada",
    }
    headers = api.transport.requests[0]["headers"]
    assert headers["Authorization"] == "Bearer coss_test_settings"
    assert api.transport.requests[0]["url"] == "https://api.coss.test/v1/emails"


def test_email_message_send_sets_coss_email(api: Api) -> None:
    email = EmailMessage("Hello", "Hi Ada", "Acme <hello@acme.test>", ["ada@example.com"])
    assert email.send() == 1
    assert email.coss_email == EMAIL
    assert email.coss_email["id"].startswith("email_")
    assert body(api)["from"] == "Acme <hello@acme.test>"


def test_send_mass_mail_counts_sent_messages(api: Api) -> None:
    sent = mail.send_mass_mail(
        [
            ("One", "1", None, ["a@example.com"]),
            ("Nobody", "-", None, []),
            ("Two", "2", "other@acme.test", ["b@example.com", "c@example.com"]),
        ]
    )
    assert sent == 2
    assert [body(api, 0)["subject"], body(api, 1)["subject"]] == ["One", "Two"]
    assert body(api, 1)["to"] == ["b@example.com", "c@example.com"]
    keys = {request["headers"]["Idempotency-Key"] for request in api.transport.requests}
    assert len(keys) == 2  # One key per message.


def test_mail_admins(api: Api) -> None:
    mail.mail_admins("Disk full", "Clean up", html_message="<b>Clean up</b>")
    assert body(api) == {
        "from": "server@acme.test",
        # Django 5.2 takes (name, address) pairs and sends only the address.
        "to": ["Ops <ops@acme.test>" if DJANGO_6 else "ops@acme.test"],
        "subject": "[Acme] Disk full",
        "html": "<b>Clean up</b>",
        "text": "Clean up",
    }


def test_messages_without_recipients_are_skipped(api: Api) -> None:
    nobody = EmailMessage("Nobody", "-", None, [])
    assert nobody.send() == 0
    assert EmailBackend().send_messages([nobody, message()]) == 1
    assert len(api.transport.requests) == 1
    assert EmailBackend().send_messages([]) == 0


def test_no_to_address_is_refused(api: Api) -> None:
    for fields in ({"bcc": ["hidden@example.com"]}, {"cc": ["carol@example.com"]}):
        with pytest.raises(ValueError, match="without a To address"):
            quietly(message(to=[], **fields).send, fail_silently=True)
    assert api.transport.requests == []


# Failures ---------------------------------------------------------------------------------------


def test_the_first_failure_raises(api: Api) -> None:
    api.respond(UNAUTHORIZED, OK)
    first, second = message(), message()
    with pytest.raises(CossError) as raised:
        EmailBackend().send_messages([first, second])
    assert raised.value.code == "invalid_api_key"
    assert raised.value.status == 401
    assert (
        str(raised.value) == "coss.com could not send the email: Invalid API key. (invalid_api_key)"
    )
    assert len(api.transport.requests) == 1


def test_fail_silently_skips_failures(api: Api) -> None:
    api.respond(UNAUTHORIZED, OK)
    first, second = message(), message()
    assert EmailBackend(fail_silently=True).send_messages([first, second]) == 1
    assert not hasattr(first, "coss_email")
    assert second.coss_email == EMAIL


def test_send_mail_fail_silently(api: Api) -> None:
    api.respond(UNAUTHORIZED)
    sent = quietly(mail.send_mail, "Hi", "Hi", None, ["ada@example.com"], fail_silently=True)
    assert sent == 0


def test_cosserror_pickles() -> None:
    error = CossError(
        type="invalid_request_error",
        code="validation_failed",
        message="Invalid request.",
        status=422,
        request_id="req_1",
        param="to",
        issues=[{"path": "to", "message": "Invalid email address."}],
    )
    copy = pickle.loads(pickle.dumps(error))
    assert str(copy) == str(error)
    assert (copy.code, copy.status, copy.param, copy.issues) == (
        "validation_failed",
        422,
        "to",
        [{"path": "to", "message": "Invalid email address."}],
    )


# Configuration ----------------------------------------------------------------------------------


def test_a_missing_key_fails_the_send_not_the_import(api: Api, settings: Any) -> None:
    settings.COSS_API_KEY = None
    backend = EmailBackend()  # Creating the backend is fine.
    with pytest.raises(ImproperlyConfigured) as raised:
        backend.send_messages([message()])
    assert "COSS_API_KEY setting" in str(raised.value)
    assert "COSS_API_KEY environment variable" in str(raised.value)
    assert EmailBackend(fail_silently=True).send_messages([message()]) == 0
    assert api.transport.requests == []


def test_the_key_falls_back_to_the_environment(
    api: Api, settings: Any, monkeypatch: pytest.MonkeyPatch
) -> None:
    del settings.COSS_API_KEY
    monkeypatch.setenv("COSS_API_KEY", "coss_test_env")
    message().send()
    assert api.transport.requests[0]["headers"]["Authorization"] == "Bearer coss_test_env"


def test_the_base_url_falls_back_to_the_environment(
    api: Api, settings: Any, monkeypatch: pytest.MonkeyPatch
) -> None:
    if hasattr(settings, "COSS_BASE_URL"):
        del settings.COSS_BASE_URL
    monkeypatch.setenv("COSS_BASE_URL", "https://eu.api.coss.test/")
    message().send()
    assert api.transport.requests[0]["url"] == "https://eu.api.coss.test/v1/emails"


def test_a_sender_naming_the_from_address_is_dropped(api: Api) -> None:
    message(from_email="hello@acme.test", headers={"Sender": "Hello@Acme.test"}).send()
    assert "headers" not in body(api)


def test_get_connection_options_win_over_settings(api: Api) -> None:
    connection = quietly(
        mail.get_connection,
        "coss_django.EmailBackend",
        api_key="coss_test_kwarg",
        base_url="https://eu.api.coss.test/",
        timeout=5,
    )
    assert isinstance(connection, EmailBackend)
    assert connection.send_messages([message()]) == 1
    request = api.transport.requests[0]
    assert request["headers"]["Authorization"] == "Bearer coss_test_kwarg"
    assert request["url"] == "https://eu.api.coss.test/v1/emails"
    assert request["timeout"] == 5


def test_timeout_and_retry_settings(api: Api, settings: Any) -> None:
    settings.COSS_TIMEOUT = 2.5
    settings.COSS_MAX_RETRIES = 0
    api.respond({"status": 503, "body": "unavailable"})
    with pytest.raises(CossError) as raised:
        message().send()
    assert raised.value.code == "unexpected_response"
    assert len(api.transport.requests) == 1
    assert api.transport.requests[0]["timeout"] == 2.5


def test_the_default_base_url(api: Api, settings: Any) -> None:
    del settings.COSS_BASE_URL
    message().send()
    assert api.transport.requests[0]["url"] == "https://api.coss.com/v1/emails"


@pytest.mark.skipif(not DJANGO_6_1, reason="MAILERS is Django 6.1+")
def test_mailers_options(api: Api) -> None:
    mailers = {
        "default": {
            "BACKEND": "coss_django.EmailBackend",
            "OPTIONS": {"api_key": "coss_test_mailer", "max_retries": 0},
        },
        "broken": {"BACKEND": "coss_django.EmailBackend", "OPTIONS": {"apikey": "x"}},
    }
    with override_settings(MAILERS=mailers), warnings.catch_warnings(record=True) as caught:
        warnings.simplefilter("always")
        assert message().send() == 1
        assert mail.mailers["default"].send_messages([message()]) == 1
        with pytest.raises(ImproperlyConfigured, match="apikey"):
            mail.mailers["broken"]
    assert [str(warning.message) for warning in caught] == []
    assert api.transport.requests[0]["headers"]["Authorization"] == "Bearer coss_test_mailer"


# Mapping ----------------------------------------------------------------------------------------


def test_html_content_subtype(api: Api) -> None:
    email = EmailMessage("Hello", "<p>Hi</p>", None, ["ada@example.com"])
    email.content_subtype = "html"
    email.send()
    assert body(api)["html"] == "<p>Hi</p>"
    assert "text" not in body(api)


def test_addresses(api: Api) -> None:
    message(
        from_email=formataddr(("Zoë Acme", "hello@acme.test")),  # RFC 2047-encoded name.
        to=["Ada Lovelace <ada@example.com>", '"Bob, Jr." <bob@example.com>'],
        cc=["carol@example.com, dan@example.com"],
        reply_to=["support@acme.test"],
    ).send()
    sent = body(api)
    assert sent["from"] == "Zoë Acme <hello@acme.test>"
    assert sent["to"] == ["Ada Lovelace <ada@example.com>", '"Bob, Jr." <bob@example.com>']
    assert sent["cc"] == ["carol@example.com", "dan@example.com"]
    assert sent["reply_to"] == ["support@acme.test"]


def test_header_rules(api: Api) -> None:
    message(
        from_email="hello@acme.test",
        to=["ada@example.com", "bob@example.com"],
        headers={
            "From": "Acme <HELLO@acme.test>",
            "To": "Bob <bob@example.com>, Ada <ada@example.com>",
            "Reply-To": "Help <help@acme.test>, ops@acme.test",
            "Return-Path": "hello@acme.test",
            "Date": "Mon, 1 Jan 2024 00:00:00 +0000",
            "List-Unsubscribe": "<https://acme.test/u>",
            "X-Count": 3,
            "X-Lazy": lazy(str, str)("lazy"),
            "X-Name": "Grüße",
        },
    ).send()
    sent = body(api)
    assert sent["from"] == "Acme <HELLO@acme.test>"
    assert sent["to"] == ["Bob <bob@example.com>", "Ada <ada@example.com>"]
    assert sent["reply_to"] == ["Help <help@acme.test>", "ops@acme.test"]
    assert sent["headers"] == {
        "List-Unsubscribe": "<https://acme.test/u>",
        "X-Count": "3",
        "X-Lazy": "lazy",
        "X-Name": "=?UTF-8?B?R3LDvMOfZQ==?=",
    }


def test_lazy_subject(api: Api) -> None:
    message(subject=lazy(str, str)("Lazy hello")).send()
    assert body(api)["subject"] == "Lazy hello"


def test_attachments(api: Api) -> None:
    email = message()
    email.attach("notes.txt", "héllo", "text/plain")
    email.attach("data.bin", b"\x00\x01")
    email.attach(None, b"%PDF", "application/pdf")
    latin = MIMEText("café", "plain", "iso-8859-1")
    latin.add_header("Content-Disposition", "attachment", filename="latin.txt")
    quietly(email.attach, latin)
    forwarded = EmailMessage("Fwd", "inner", "x@acme.test", ["y@example.com"])
    email.attach("forwarded.eml", forwarded, "message/rfc822")
    email.send()
    attachments = body(api)["attachments"]
    assert attachments[:3] == [
        {"filename": "notes.txt", "content": "aMOpbGxv", "content_type": "text/plain"},
        {"filename": "data.bin", "content": "AAE=", "content_type": "application/octet-stream"},
        {"filename": "attachment-3", "content": "JVBERg==", "content_type": "application/pdf"},
    ]
    # Text parts are sent as UTF-8.
    assert attachments[3] == {
        "filename": "latin.txt",
        "content": "Y2Fmw6k=",
        "content_type": "text/plain",
    }
    assert attachments[4]["filename"] == "forwarded.eml"
    assert attachments[4]["content_type"] == "message/rfc822"


@pytest.mark.skipif(not DJANGO_6, reason="MIMEPart attachments are Django 6.0+")
def test_mimepart_attachments(api: Api) -> None:
    from email.message import MIMEPart

    logo = MIMEPart()
    logo.set_content(
        b"\x89PNG",
        maintype="image",
        subtype="png",
        disposition="inline",
        filename="logo.png",
        cid="<logo@acme>",
    )
    text = MIMEPart()
    text.set_content("日本語", filename="ja.txt")  # set_content() ends text with a newline.
    email = message()
    email.attach(logo)
    email.attach(text)
    email.send()
    assert body(api)["attachments"] == [
        {
            "filename": "logo.png",
            "content": "iVBORw==",
            "content_type": "image/png",
            "content_id": "logo@acme",
        },
        {"filename": "ja.txt", "content": "5pel5pys6KqeCg==", "content_type": "text/plain"},
    ]


def test_coss_options(api: Api) -> None:
    email = message()
    email.coss = {
        "category": "receipts",
        "tags": [{"name": "plan", "value": "pro"}],
        "scheduled_at": datetime(2026, 11, 1, 10, 0, 0, 123, tzinfo=ZoneInfo("Europe/Berlin")),
        "tracking": {"clicks": False, "unsubscribe": False},
        "idempotency_key": "order-42",
    }
    email.send()
    sent = body(api)
    assert sent["category"] == "receipts"
    assert sent["tags"] == [{"name": "plan", "value": "pro"}]
    assert sent["scheduled_at"] == "2026-11-01T09:00:00Z"
    assert sent["tracking"] == {"clicks": False, "unsubscribe": False}
    assert api.transport.requests[0]["headers"]["Idempotency-Key"] == "order-42"


def test_a_naive_scheduled_at_is_in_the_current_time_zone(api: Api) -> None:
    email = message()
    email.coss = {"scheduled_at": datetime(2026, 7, 1, 12, 0)}
    email.send()  # TIME_ZONE is Europe/Berlin (CEST, +02:00).
    assert body(api)["scheduled_at"] == "2026-07-01T10:00:00Z"
    with timezone.override("America/New_York"):
        email.send()
    assert body(api)["scheduled_at"] == "2026-07-01T16:00:00Z"
    email.coss = {"scheduled_at": datetime.now(dt_timezone.utc) + timedelta(days=1)}
    email.send()
    assert body(api)["scheduled_at"].endswith("Z")


@pytest.mark.parametrize(
    ("fields", "match"),
    [
        ({"alternatives": [("BEGIN:VCALENDAR", "text/calendar")]}, "text/calendar"),
        (
            {"alternatives": [("<p>1</p>", "text/html"), ("<p>2</p>", "text/html")]},
            "second HTML part",
        ),
        ({"headers": {"Sender": "other@acme.test"}}, "Sender"),
        ({"headers": {"From": "Other <other@acme.test>"}}, "From header"),
        ({"headers": {"To": "Undisclosed recipients:;"}}, "To header"),
        ({"headers": {"Cc": "carol@example.com"}}, "Cc header"),
        ({"headers": {"Bcc": "dan@example.com"}}, "Bcc is not a valid email header"),
        ({"headers": {"Return-Path": "bounces@acme.test"}}, "Return-Path"),
        ({"headers": {"X-A": "1", "x-a": "2"}}, "several values"),
        ({"headers": {"X-A": ["1", "2"]}}, "several values"),
        ({"subject": "Hello\nBcc: victim@example.com"}, "newlines"),
        ({"to": ["Ada <>"]}, "not a valid email address"),
        ({"cc": ["a@b@c"]}, "not a valid email address"),
    ],
)
def test_refusals(api: Api, fields: dict[str, Any], match: str) -> None:
    with pytest.raises(ValueError, match=match):
        message(**fields).send()
    # Refusals are mistakes in the message: they raise even with fail_silently.
    with pytest.raises(ValueError, match=match):
        EmailBackend(fail_silently=True).send_messages([message(**fields)])
    assert api.transport.requests == []


def test_other_body_subtypes_and_multipart_attachments_are_refused(api: Api) -> None:
    email = message()
    email.content_subtype = "markdown"
    with pytest.raises(ValueError, match="text/markdown"):
        email.send()
    email = message()
    quietly(email.attach, MIMEMultipart())
    with pytest.raises(ValueError, match="multipart"):
        email.send()
    assert api.transport.requests == []


@pytest.mark.parametrize(
    ("coss", "match"),
    [
        ({"categroy": "x"}, "unknown message.coss option"),
        ("receipts", "must be a dict"),
        ({"category": 1}, "category"),
        ({"tags": {"plan": 1}}, "strings"),
        ({"tags": [{"name": "plan"}]}, "tags"),
        ({"tags": "plan=pro"}, "tags"),
        ({"tracking": {"opens": "yes"}}, "tracking"),
        ({"tracking": {"replies": True}}, "tracking"),
        ({"scheduled_at": datetime(2026, 1, 1).date()}, "not a date"),
        ({"scheduled_at": 1767225600}, "not int"),
        ({"idempotency_key": ""}, "idempotency_key"),
    ],
)
def test_invalid_coss_options(api: Api, coss: Any, match: str) -> None:
    email = message()
    email.coss = coss
    with pytest.raises(ValueError, match=match):
        email.send()
    assert api.transport.requests == []
