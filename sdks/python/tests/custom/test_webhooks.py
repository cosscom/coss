import datetime as dt
import json
import pathlib

import pytest

from coss.webhooks import WebhookVerificationError, verify_log_drain_batch, verify_webhook

FIXTURE = json.loads((pathlib.Path(__file__).parents[4] / "integrations/conformance/webhooks.json").read_text())


@pytest.mark.parametrize("case", FIXTURE["cases"], ids=lambda case: case["name"])
def test_conformance(case: dict) -> None:
    verify = verify_log_drain_batch if case["kind"] == "log_drain" else verify_webhook
    now = dt.datetime.fromtimestamp(case.get("now", FIXTURE["now"]), dt.timezone.utc)

    def run() -> object:
        return verify(
            case["payload"],
            case["headers"],
            case.get("secret", FIXTURE["secret"]),
            tolerance_seconds=case.get("tolerance_seconds", FIXTURE["tolerance_seconds"]),
            now=now,
        )

    if "error" in case["expect"]:
        with pytest.raises(WebhookVerificationError) as error:
            run()
        assert str(error.value) == case["expect"]["error"]
    else:
        assert run() == case["expect"]["value"]


def test_accepts_bytes_and_list_headers() -> None:
    case = FIXTURE["cases"][0]
    headers = {name: [value] for name, value in case["headers"].items()}
    event = verify_webhook(
        case["payload"].encode(),
        headers,
        FIXTURE["secret"],
        now=dt.datetime.fromtimestamp(FIXTURE["now"], dt.timezone.utc),
    )
    assert event == case["expect"]["value"]


def test_rejects_bytes_that_arent_utf8() -> None:
    import base64
    import hashlib
    import hmac

    key = base64.b64decode(FIXTURE["secret"].removeprefix("whsec_"))
    body = b'{"type": "\xff"}'
    signature = base64.b64encode(hmac.new(key, b"msg_1.%d." % FIXTURE["now"] + body, hashlib.sha256).digest())
    headers = {
        "webhook-id": "msg_1",
        "webhook-timestamp": str(FIXTURE["now"]),
        "webhook-signature": f"v1,{signature.decode()}",
    }
    now = dt.datetime.fromtimestamp(FIXTURE["now"], dt.timezone.utc)
    with pytest.raises(WebhookVerificationError, match="not valid JSON"):
        verify_webhook(body, headers, FIXTURE["secret"], now=now)
    with pytest.raises(WebhookVerificationError, match="not valid NDJSON"):
        verify_log_drain_batch(body, headers, FIXTURE["secret"], now=now)
    with pytest.raises(WebhookVerificationError, match="No webhook signature matches"):
        verify_webhook(body + b"\xfe", headers, FIXTURE["secret"], now=now)
