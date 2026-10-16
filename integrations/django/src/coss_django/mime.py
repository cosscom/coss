"""Helpers that turn a message's parts into the coss.com API's fields.

They mirror the JavaScript SDK's `packages/sdk/src/core/mime.ts` (see `integrations/README.md`):
every driver formats addresses, encodes header values and drops reserved headers the same way.
"""

from __future__ import annotations

import base64
import re
from collections.abc import Iterable

__all__ = [
    "bare_content_id",
    "custom_headers",
    "encode_header_value",
    "format_address",
    "is_reserved_header",
    "media_type",
    "to_base64",
]

# Headers the API refuses because coss.com or the provider sets them (`RESERVED_HEADERS` in
# `packages/email/src/schemas.ts`). Mailers set several of these on every message, so they are
# dropped, not sent.
RESERVED_HEADERS = frozenset(
    {
        "from",
        "to",
        "cc",
        "bcc",
        "reply-to",
        "subject",
        "sender",
        "return-path",
        "date",
        "message-id",
        "mime-version",
        "content-type",
        "content-transfer-encoding",
        "content-disposition",
        "dkim-signature",
        "received",
    }
)

# What JavaScript's `String.prototype.trim()` removes (Python's `str.strip()` keeps U+FEFF).
_TRIM = (
    " \t\n\v\f\r\u00a0\u1680\u2000\u2001\u2002\u2003\u2004\u2005\u2006\u2007\u2008"
    "\u2009\u200a\u2028\u2029\u202f\u205f\u3000\ufeff"
)

# RFC 5322 specials (minus "."): the API refuses them in an unquoted display name.
_NAME_SPECIALS = re.compile(r'["<>,;:@()\[\]\\]')
_FOLD = re.compile(r"\r?\n[ \t]*")
_CONTROL = re.compile(r"[\x00-\x1f\x7f-\x9f]")
_SURROGATE = re.compile(r"[\ud800-\udfff]")
_PRINTABLE_ASCII = re.compile(r"[ -~]*")

# One encoded-word holds at most 75 characters: `=?UTF-8?B?` + base64 + `?=` leaves 63 for the
# base64, i.e. 45 bytes of UTF-8 (rounded down to whole characters).
_ENCODED_WORD_BYTES = 45


def trim(value: str) -> str:
    """`value` without leading and trailing whitespace, as JavaScript trims it."""
    return value.strip(_TRIM)


def is_reserved_header(name: str) -> bool:
    """Whether the API would refuse a custom header with this name."""
    lower = name.lower()
    return lower in RESERVED_HEADERS or lower.startswith("x-ses-")


def format_address(address: str, name: str | None = None) -> str:
    """`addr`, or `Name <addr>` with the name quoted when it needs to be."""
    display = trim(name) if name else ""
    if not display:
        return address
    if _NAME_SPECIALS.search(display):
        display = '"' + re.sub(r'(["\\])', r"\\\1", display) + '"'
    return f"{display} <{address}>"


def _encoded_word(chunk: bytes) -> str:
    return "=?UTF-8?B?" + base64.b64encode(chunk).decode("ascii") + "?="


def encode_header_value(value: str) -> str:
    """A header value as the API takes it: one line of printable ASCII.

    Folded lines are unfolded, other control characters become spaces, and anything non-ASCII
    becomes RFC 2047 encoded-words (`=?UTF-8?B?…?=`) of at most 45 bytes each.
    """
    unfolded = trim(_CONTROL.sub(" ", _FOLD.sub(" ", value)))
    if _PRINTABLE_ASCII.fullmatch(unfolded):
        return unfolded
    # A lone surrogate can't be encoded; JavaScript's TextEncoder writes U+FFFD for it.
    unfolded = _SURROGATE.sub("\ufffd", unfolded)
    words: list[str] = []
    chunk = b""
    for character in unfolded:
        encoded = character.encode("utf-8")
        if len(chunk) + len(encoded) > _ENCODED_WORD_BYTES:
            words.append(_encoded_word(chunk))
            chunk = b""
        chunk += encoded
    if chunk:
        words.append(_encoded_word(chunk))
    return " ".join(words)


def custom_headers(entries: Iterable[tuple[str, str]]) -> dict[str, str] | None:
    """Custom headers for the API: reserved ones dropped, values encoded, empty ones left out.

    Names are kept as given (the API treats them case-insensitively). `None` when none is left.
    """
    headers: dict[str, str] = {}
    for name, value in entries:
        trimmed = trim(name)
        if not trimmed or is_reserved_header(trimmed):
            continue
        encoded = encode_header_value(value)
        if encoded:
            headers[trimmed] = encoded
    return headers or None


def media_type(content_type: str | None) -> str | None:
    """`type/subtype` without parameters (`text/plain; charset=utf-8` → `text/plain`)."""
    if not content_type:
        return None
    return trim(content_type.split(";", 1)[0]).lower() or None


def bare_content_id(content_id: str | None) -> str | None:
    """A Content-ID without its angle brackets (`<logo@acme>` → `logo@acme`)."""
    if not content_id:
        return None
    bare = trim(content_id)
    if bare.startswith("<"):
        bare = bare[1:]
    if bare.endswith(">"):
        bare = bare[:-1]
    return bare or None


def to_base64(data: bytes) -> str:
    """Standard, padded base64 without line breaks."""
    return base64.b64encode(data).decode("ascii")
