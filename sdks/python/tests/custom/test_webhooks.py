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
