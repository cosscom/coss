"""End to end against the API's test app.

    bun run --cwd apps/api serve:test  # prints {base_url, sandbox_key, live_key, live_from}
    COSS_E2E='<that JSON>' .venv/bin/pytest tests/custom/test_e2e.py

Skipped without `COSS_E2E`.
"""

import json
import os
import re
import typing

import pytest

from coss import Coss
from coss.errors import NotFoundError, UnprocessableEntityError

E2E = os.environ.get("COSS_E2E")
pytestmark = pytest.mark.skipif(not E2E, reason="COSS_E2E is not set (see the module docstring)")

# Every read that takes no arguments: each response must parse into the generated models.
READS = [
    "environment.get",
    "reputation.get",
    "billing.get",
    "billing.usage",
    "billing.invoices.list",
    "billing.credits.list",
    "logs.list",
    "auditEvents.list",
    "logDrains.list",
    "email.list",
    "email.suppressions.list",
    "email.templates.list",
    "email.contacts.list",
    "email.contacts.properties.list",
    "email.broadcasts.list",
    "email.audiences.list",
    "email.segments.list",
    "email.topics.list",
    "email.marketingSettings.get",
    "email.tracking.get",
    "email.dedicatedIps.get",
    "email.received.list",
    "domains.list",
    "webhookEndpoints.list",
    "hooks.applications.list",
    "hooks.eventTypes.list",
    "risk.assessments.list",
    "risk.lists.list",
    "risk.settings.get",
    "risk.rules.list",
    "risk.limitBuckets.list",
]


@pytest.fixture
def server() -> typing.Dict[str, str]:
    assert E2E
    return json.loads(E2E)


@pytest.fixture
def coss(server: typing.Dict[str, str]) -> Coss:
    return Coss(api_key=server["sandbox_key"], base_url=server["base_url"])


def snake(name: str) -> str:
    return re.sub(r"(?<!^)(?=[A-Z])", "_", name).lower()


def test_send_get_and_list(coss: Coss) -> None:
    email = coss.email.send(
        from_="Acme <hello@acme.test>",
        to=["ada@example.com"],
        subject="Hello from Python",
        text="It works.",
        tags=[{"name": "sdk", "value": "python"}],
    )
    assert email.id.startswith("email_")
    assert email.status in ("queued", "sent")

    fetched = coss.email.get(email.id)
    assert fetched.id == email.id
    assert fetched.subject == "Hello from Python"

    page = coss.email.list(limit=1)
    assert page.object == "list"
    assert len(page.data) == 1
    if page.has_more:
        assert coss.email.list(limit=1, after=page.data[0].id).data[0].id != page.data[0].id


def test_validation_error(coss: Coss) -> None:
    with pytest.raises(UnprocessableEntityError) as raised:
        coss.email.send(from_="not an address", to=["ada@example.com"], subject="Hi", text="Hi")
    error = raised.value.body.error
    assert error.type == "invalid_request_error"
    assert error.request_id.startswith("req_")
    assert error.issues


def test_not_found(coss: Coss) -> None:
    with pytest.raises(NotFoundError) as raised:
        coss.email.get("email_01k00000000000000000000000")
    assert raised.value.body.error.type == "not_found_error"


def test_csv_export(coss: Coss) -> None:
    csv = coss.email.suppressions.export()
    assert csv.startswith("address,scope,reason,")


@pytest.mark.parametrize("path", READS)
def test_reads_parse(coss: Coss, path: str) -> None:
    target: typing.Any = coss
    for name in path.split("."):
        target = getattr(target, snake(name))
    target()
