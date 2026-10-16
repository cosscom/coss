"""`coss_django.EmailBackend`: Django's email, sent through the coss.com API."""

from __future__ import annotations

import email.message
import mimetypes
import os
from collections.abc import Iterable, Mapping, Sequence
from datetime import date, datetime
from datetime import timezone as dt_timezone
from email.header import decode_header, make_header
from email.utils import getaddresses
from typing import Any

from django.conf import settings
from django.core.exceptions import ImproperlyConfigured
from django.core.mail.backends.base import BaseEmailBackend
from django.core.mail.message import BadHeaderError
from django.utils import timezone
from django.utils.encoding import force_str

from coss_django.client import CossClient, CossError
from coss_django.mime import (
    bare_content_id,
    custom_headers,
    format_address,
    media_type,
    to_base64,
)

__all__ = ["EmailBackend"]

DEFAULT_ATTACHMENT_MIME_TYPE = "application/octet-stream"

_COSS_KEYS = ("category", "tags", "scheduled_at", "tracking", "idempotency_key")
_TRACKING_KEYS = ("opens", "clicks", "unsubscribe")

# Address headers in `extra_headers` that Django itself treats specially.
_ADDRESS_HEADERS = {"from", "to", "cc", "bcc", "reply-to", "sender", "return-path"}


def _refuse(what: str, instead: str) -> ValueError:
    return ValueError(f"coss_django: {what} can't be sent through coss.com; {instead}.")


class EmailBackend(BaseEmailBackend):
    """Sends each message with one `POST /v1/emails`.

    Settings: `COSS_API_KEY` (else the `COSS_API_KEY` environment variable), `COSS_BASE_URL`,
    `COSS_TIMEOUT` (seconds per attempt) and `COSS_MAX_RETRIES`. The keyword arguments (or a
    `MAILERS` entry's `OPTIONS` on Django 6.1+) take precedence over them.
    """

    def __init__(
        self,
        fail_silently: bool = False,
        api_key: str | None = None,
        base_url: str | None = None,
        timeout: float | None = None,
        max_retries: int | None = None,
        **kwargs: Any,
    ) -> None:
        # `fail_silently` stays ours: Django 6.1's base class reports it as an unknown option.
        super().__init__(**kwargs)
        self.fail_silently = fail_silently
        self.api_key = api_key
        self.base_url = base_url
        self.timeout = timeout
        self.max_retries = max_retries
        self._client: CossClient | None = None

    def send_messages(self, email_messages: Iterable[Any]) -> int:
        """Sends every message with recipients; returns how many coss.com accepted.

        On success each message gets `coss_email`, the email as the API returned it
        (`message.coss_email["id"]` is its `email_…` id).
        """
        if not email_messages:
            return 0
        sent = 0
        for message in email_messages:
            if not message.recipients():
                continue
            params, idempotency_key = _message_params(message)
            try:
                result = self._get_client().send_email(params, idempotency_key=idempotency_key)
            except (CossError, ImproperlyConfigured):
                if not self.fail_silently:
                    raise
                continue
            message.coss_email = result
            sent += 1
        return sent

    def _get_client(self) -> CossClient:
        if self._client is None:
            api_key = (
                self.api_key
                or getattr(settings, "COSS_API_KEY", None)
                or os.environ.get("COSS_API_KEY")
            )
            if not api_key:
                raise ImproperlyConfigured(
                    "coss_django needs a coss.com API key: set the COSS_API_KEY setting "
                    "or the COSS_API_KEY environment variable."
                )
            self._client = CossClient(
                api_key,
                base_url=_first(
                    self.base_url,
                    getattr(settings, "COSS_BASE_URL", None),
                    os.environ.get("COSS_BASE_URL") or None,
                ),
                timeout=_first(self.timeout, getattr(settings, "COSS_TIMEOUT", None)),
                max_retries=_first(self.max_retries, getattr(settings, "COSS_MAX_RETRIES", None)),
            )
        return self._client


def _first(*values: Any) -> Any:
    return next((value for value in values if value is not None), None)


def _message_params(message: Any) -> tuple[dict[str, Any], str | None]:
    """The `POST /v1/emails` body for a Django `EmailMessage`, and its idempotency key.

    Raises `ValueError` for what coss.com can't send.
    """
    coss, idempotency_key = _coss_options(getattr(message, "coss", None))
    headers = _extra_headers(getattr(message, "extra_headers", None))

    from_addresses = _addresses([message.from_email or settings.DEFAULT_FROM_EMAIL], "from_email")
    if len(from_addresses) != 1:
        raise ValueError("coss_django: from_email must be exactly one address.")
    from_addresses = _header_addresses(headers, "From", "from_email", from_addresses)
    to = _header_addresses(headers, "To", "to", _addresses(message.to, "to"))
    cc = _header_addresses(headers, "Cc", "cc", _addresses(message.cc, "cc"))
    bcc = _addresses(message.bcc, "bcc")
    reply_to = _addresses(message.reply_to, "reply_to")
    if "reply-to" in headers:
        # Django documents that a Reply-To header replaces `reply_to`.
        reply_to = _addresses([headers.pop("reply-to")[1]], "the Reply-To header")
    if "bcc" in headers:
        raise ValueError(
            'Bcc is not a valid email header. Use the "bcc" argument to specify blind carbon '
            "copy recipients."
        )
    if "sender" in headers:
        # Harmless when it names the From address; anything else is a separate envelope.
        sender = _addresses([headers.pop("sender")[1]], "the Sender header")
        if _bare(sender) != _bare(from_addresses):
            raise _refuse(
                "a Sender header other than from_email", "coss.com sets the Sender header itself"
            )
    if "return-path" in headers:
        return_path = _addresses([headers.pop("return-path")[1]], "the Return-Path header")
        if _bare(return_path) != _bare(from_addresses):
            raise _refuse("a Return-Path other than from_email", "coss.com handles bounces itself")

    subject = force_str(message.subject)
    if "\n" in subject or "\r" in subject:
        raise BadHeaderError(
            f"Header values can't contain newlines (got {subject!r} for header 'Subject')"
        )

    if not to:
        raise _refuse(
            "a message without a To address",
            "coss.com needs at least one and never moves cc or bcc addresses into to",
        )

    html, text = _bodies(message)

    params: dict[str, Any] = {"from": _format(from_addresses)[0], "to": _format(to)}
    if cc:
        params["cc"] = _format(cc)
    if bcc:
        params["bcc"] = _format(bcc)
    if reply_to:
        params["reply_to"] = _format(reply_to)
    params["subject"] = subject
    if html:
        params["html"] = html
    if text:
        params["text"] = text
    attachments = [
        _attachment(item, index) for index, item in enumerate(message.attachments or [], 1)
    ]
    if attachments:
        params["attachments"] = attachments
    custom = custom_headers(headers.values())
    if custom:
        params["headers"] = custom
    params.update(coss)
    return params, idempotency_key


# Addresses -------------------------------------------------------------------------------------

Address = tuple[str, str]


def _decode_name(name: str) -> str:
    """Display names may arrive RFC 2047-encoded (e.g. from `email.utils.formataddr`)."""
    if "=?" not in name:
        return name
    try:
        return str(make_header(decode_header(name)))
    except (ValueError, LookupError, UnicodeDecodeError):
        return name


def _addresses(values: Iterable[Any] | None, field: str) -> list[Address]:
    """Django's address strings (`addr` or `Name <addr>`, or `(name, addr)` pairs) as pairs."""
    result: list[Address] = []
    for value in values or []:
        if isinstance(value, (list, tuple)) and len(value) == 2:
            result.append((force_str(value[0] or ""), force_str(value[1])))
            continue
        text = force_str(value)
        if not text.strip():
            continue
        parsed = [(name, address) for name, address in getaddresses([text]) if name or address]
        if not parsed or any(not address for _, address in parsed):
            raise ValueError(f"coss_django: {text!r} in {field} is not a valid email address.")
        result.extend((_decode_name(name), address) for name, address in parsed)
    return result


def _bare(addresses: Sequence[Address]) -> list[str]:
    return sorted(address.lower() for _, address in addresses)


def _format(addresses: Sequence[Address]) -> list[str]:
    return [format_address(address, name) for name, address in addresses]


def _header_addresses(
    headers: dict[str, tuple[str, Any]], name: str, field: str, addresses: list[Address]
) -> list[Address]:
    """A From/To/Cc header must name the message's own addresses; its display names win.

    Django sends the header to the SMTP server separately from the envelope (`from_email`, the
    recipients), so they can differ there; coss.com sends one message to the addresses it shows.
    """
    entry = headers.pop(name.lower(), None)
    if entry is None:
        return addresses
    given = _addresses([entry[1]], f"the {name} header")
    if _bare(given) != _bare(addresses):
        raise _refuse(
            f"a {name} header that differs from the message's {field}",
            f"set {field} to the addresses the {name} header shows",
        )
    return given


# Headers and bodies ----------------------------------------------------------------------------


def _extra_headers(extra: Mapping[Any, Any] | None) -> dict[str, tuple[str, Any]]:
    """`extra_headers` by lower-cased name, refusing one name given twice (in any case)."""
    headers: dict[str, tuple[str, Any]] = {}
    for raw_name, value in (extra or {}).items():
        name = force_str(raw_name)
        lower = name.strip().lower()
        if lower in headers or isinstance(value, (list, tuple, set)):
            raise _refuse(
                f"the {name!r} header with several values", "coss.com sends each header once"
            )
        if lower in _ADDRESS_HEADERS:
            headers[lower] = (name, value)
        else:
            headers[lower] = (name, force_str(value))
    return headers


def _content_text(content: Any) -> str:
    if isinstance(content, (bytes, bytearray)):
        return content.decode("utf-8")
    return force_str(content)


def _bodies(message: Any) -> tuple[str | None, str | None]:
    """(html, text): `body` by `content_subtype`, plus at most one `text/html` alternative."""
    body = force_str(message.body or "")
    subtype = getattr(message, "content_subtype", "plain")
    html: str | None = None
    text: str | None = None
    if subtype == "html":
        html = body or None
    elif subtype == "plain":
        text = body or None
    elif body:
        raise _refuse(f"a text/{subtype} body", "send a plain text or HTML body")
    for alternative in getattr(message, "alternatives", None) or []:
        content, mimetype = alternative[0], alternative[1]
        if media_type(force_str(mimetype)) != "text/html":
            raise _refuse(
                f"an alternative part of type {mimetype}",
                "send a plain text body and at most one text/html alternative",
            )
        if html is not None:
            raise _refuse(
                "a second HTML part", "send a plain text body and at most one text/html alternative"
            )
        html = _content_text(content) or None
    return html, text


# Attachments -----------------------------------------------------------------------------------


def _content_bytes(content: Any) -> bytes:
    if isinstance(content, str):
        return content.encode("utf-8")
    if isinstance(content, (bytes, bytearray, memoryview)):
        return bytes(content)
    if hasattr(content, "message") and callable(content.message):  # A Django EmailMessage.
        return content.message().as_bytes()
    if isinstance(content, email.message.Message):
        return content.as_bytes()
    return force_str(content).encode("utf-8")


def _attachment(item: Any, index: int) -> dict[str, str]:
    if isinstance(item, email.message.Message):
        return _mime_attachment(item, index)
    filename, content, mimetype = item
    filename = force_str(filename) if filename else None
    if not mimetype and filename:
        mimetype = mimetypes.guess_type(filename)[0] or DEFAULT_ATTACHMENT_MIME_TYPE
    attachment = {
        "filename": filename or f"attachment-{index}",
        "content": to_base64(_content_bytes(content)),
    }
    content_type = media_type(force_str(mimetype) if mimetype else None)
    if content_type:
        attachment["content_type"] = content_type
    return attachment


def _mime_attachment(part: email.message.Message, index: int) -> dict[str, str]:
    """An `email.mime` (`MIMEBase`) or `email.message.MIMEPart` attachment."""
    content_type = part.get_content_type()
    if part.get_content_maintype() == "message" and part.is_multipart():
        # message/rfc822: the payload is the attached message itself.
        data = b"".join(inner.as_bytes() for inner in part.get_payload())
    elif part.is_multipart():
        raise _refuse(
            "a multipart MIME attachment", "attach each file as its own part (or a tuple)"
        )
    else:
        data = _part_bytes(part)
    attachment = {
        "filename": part.get_filename() or f"attachment-{index}",
        "content": to_base64(data),
        "content_type": content_type,
    }
    content_id = bare_content_id(part.get("Content-ID"))
    if content_id:
        attachment["content_id"] = content_id
    return attachment


def _part_bytes(part: email.message.Message) -> bytes:
    """A leaf part's bytes; text is re-encoded as UTF-8 (as Django's own `str` content is)."""
    if part.get_content_maintype() == "text" and isinstance(part, email.message.MIMEPart):
        try:
            return part.get_content().encode("utf-8")
        except (KeyError, LookupError, UnicodeError):
            pass
    data = part.get_payload(decode=True)
    if not isinstance(data, bytes):
        return b""
    charset = part.get_content_charset()
    if part.get_content_maintype() == "text" and charset:
        try:
            return data.decode(charset).encode("utf-8")
        except (LookupError, UnicodeError):
            return data
    return data


# coss.com options ------------------------------------------------------------------------------


def _coss_options(value: Any) -> tuple[dict[str, Any], str | None]:
    """`message.coss` validated, as API fields, plus the idempotency key."""
    if value is None:
        return {}, None
    if not isinstance(value, Mapping):
        raise ValueError("coss_django: message.coss must be a dict.")
    unknown = [key for key in value if key not in _COSS_KEYS]
    if unknown:
        raise ValueError(
            f"coss_django: unknown message.coss option(s) {', '.join(map(repr, unknown))}; "
            f"use {', '.join(_COSS_KEYS)}."
        )
    fields: dict[str, Any] = {}
    category = value.get("category")
    if category is not None:
        fields["category"] = _string(category, "category")
    tags = _tags(value.get("tags"))
    if tags:
        fields["tags"] = tags
    scheduled_at = value.get("scheduled_at")
    if scheduled_at is not None:
        fields["scheduled_at"] = _scheduled_at(scheduled_at)
    tracking = _tracking(value.get("tracking"))
    if tracking:
        fields["tracking"] = tracking
    idempotency_key = value.get("idempotency_key")
    if idempotency_key is not None:
        idempotency_key = _string(idempotency_key, "idempotency_key")
    return fields, idempotency_key


def _string(value: Any, option: str) -> str:
    if not isinstance(value, str) or not value:
        raise ValueError(f"coss_django: message.coss[{option!r}] must be a non-empty string.")
    return value


def _tags(value: Any) -> list[dict[str, str]]:
    """A `{name: value}` map (order kept) or a list of `{"name": …, "value": …}`."""
    if value is None:
        return []
    if isinstance(value, Mapping):
        pairs = list(value.items())
    elif isinstance(value, (list, tuple)):
        pairs = []
        for tag in value:
            if not isinstance(tag, Mapping) or set(tag) != {"name", "value"}:
                raise ValueError(
                    'coss_django: message.coss["tags"] entries must be '
                    '{"name": ..., "value": ...} dicts.'
                )
            pairs.append((tag["name"], tag["value"]))
    else:
        raise ValueError(
            'coss_django: message.coss["tags"] must be a dict or a list of '
            '{"name": ..., "value": ...} dicts.'
        )
    for name, tag_value in pairs:
        if not isinstance(name, str) or not isinstance(tag_value, str):
            raise ValueError('coss_django: message.coss["tags"] names and values must be strings.')
    return [{"name": name, "value": tag_value} for name, tag_value in pairs]


def _scheduled_at(value: Any) -> str:
    """UTC `YYYY-MM-DDTHH:MM:SSZ`; a naive datetime is in the current Django time zone."""
    if isinstance(value, str):
        return _string(value, "scheduled_at")
    if isinstance(value, datetime):
        if timezone.is_naive(value):
            value = timezone.make_aware(value)
        return value.astimezone(dt_timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    kind = "a date" if isinstance(value, date) else type(value).__name__
    raise ValueError(
        f'coss_django: message.coss["scheduled_at"] must be a datetime or a string, not {kind}.'
    )


def _tracking(value: Any) -> dict[str, bool]:
    if value is None:
        return {}
    if not isinstance(value, Mapping):
        raise ValueError('coss_django: message.coss["tracking"] must be a dict.')
    tracking: dict[str, bool] = {}
    for key, flag in value.items():
        if key not in _TRACKING_KEYS or not isinstance(flag, bool):
            raise ValueError(
                'coss_django: message.coss["tracking"] takes "opens", "clicks" and "unsubscribe", '
                "each True or False."
            )
        tracking[key] = flag
    return tracking
