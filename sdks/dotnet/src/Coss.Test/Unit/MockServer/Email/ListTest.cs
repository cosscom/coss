using Coss;
using Coss.Test.Unit.MockServer;
using Coss.Test.Utils;
using NUnit.Framework;

namespace Coss.Test.Unit.MockServer.Email;

[TestFixture]
[Parallelizable(ParallelScope.Self)]
public class ListTest : BaseMockServerTest
{
    [NUnit.Framework.Test]
    public async Task MockServerTest_1()
    {
        const string mockResponse = """
            {
              "object": "list",
              "data": [
                {
                  "object": "email",
                  "id": "id",
                  "from": "from",
                  "to": [
                    "to",
                    "to"
                  ],
                  "cc": [
                    "cc",
                    "cc"
                  ],
                  "bcc": [
                    "bcc",
                    "bcc"
                  ],
                  "reply_to": [
                    "reply_to",
                    "reply_to"
                  ],
                  "subject": "subject",
                  "tags": [
                    {
                      "name": "name",
                      "value": "value"
                    },
                    {
                      "name": "name",
                      "value": "value"
                    }
                  ],
                  "category": "category",
                  "stream": "transactional",
                  "status": "queued",
                  "failure": {
                    "code": "code",
                    "message": "message"
                  },
                  "recipients": [
                    {
                      "address": "address",
                      "type": "to",
                      "status": "queued",
                      "last_event_at": "2024-01-15T09:30:00.000Z"
                    },
                    {
                      "address": "address",
                      "type": "to",
                      "status": "queued",
                      "last_event_at": "2024-01-15T09:30:00.000Z"
                    }
                  ],
                  "sandbox": true,
                  "tracking": {
                    "opens": true,
                    "clicks": true,
                    "unsubscribe": true,
                    "open_count": 1000000,
                    "first_opened_at": "2024-01-15T09:30:00.000Z",
                    "last_opened_at": "2024-01-15T09:30:00.000Z",
                    "click_count": 1000000,
                    "first_clicked_at": "2024-01-15T09:30:00.000Z",
                    "last_clicked_at": "2024-01-15T09:30:00.000Z"
                  },
                  "created_at": "2024-01-15T09:30:00.000Z",
                  "sent_at": "2024-01-15T09:30:00.000Z",
                  "scheduled_at": "2024-01-15T09:30:00.000Z",
                  "batch_id": "batch_id",
                  "template": {
                    "id": "id",
                    "version": 1000000,
                    "locale": "locale"
                  },
                  "broadcast_id": "broadcast_id",
                  "subaccount_id": "subaccount_id",
                  "content_storage": {
                    "mode": "store",
                    "discarded_at": "2024-01-15T09:30:00.000Z"
                  }
                },
                {
                  "object": "email",
                  "id": "id",
                  "from": "from",
                  "to": [
                    "to",
                    "to"
                  ],
                  "cc": [
                    "cc",
                    "cc"
                  ],
                  "bcc": [
                    "bcc",
                    "bcc"
                  ],
                  "reply_to": [
                    "reply_to",
                    "reply_to"
                  ],
                  "subject": "subject",
                  "tags": [
                    {
                      "name": "name",
                      "value": "value"
                    },
                    {
                      "name": "name",
                      "value": "value"
                    }
                  ],
                  "category": "category",
                  "stream": "transactional",
                  "status": "queued",
                  "failure": {
                    "code": "code",
                    "message": "message"
                  },
                  "recipients": [
                    {
                      "address": "address",
                      "type": "to",
                      "status": "queued",
                      "last_event_at": "2024-01-15T09:30:00.000Z"
                    },
                    {
                      "address": "address",
                      "type": "to",
                      "status": "queued",
                      "last_event_at": "2024-01-15T09:30:00.000Z"
                    }
                  ],
                  "sandbox": true,
                  "tracking": {
                    "opens": true,
                    "clicks": true,
                    "unsubscribe": true,
                    "open_count": 1000000,
                    "first_opened_at": "2024-01-15T09:30:00.000Z",
                    "last_opened_at": "2024-01-15T09:30:00.000Z",
                    "click_count": 1000000,
                    "first_clicked_at": "2024-01-15T09:30:00.000Z",
                    "last_clicked_at": "2024-01-15T09:30:00.000Z"
                  },
                  "created_at": "2024-01-15T09:30:00.000Z",
                  "sent_at": "2024-01-15T09:30:00.000Z",
                  "scheduled_at": "2024-01-15T09:30:00.000Z",
                  "batch_id": "batch_id",
                  "template": {
                    "id": "id",
                    "version": 1000000,
                    "locale": "locale"
                  },
                  "broadcast_id": "broadcast_id",
                  "subaccount_id": "subaccount_id",
                  "content_storage": {
                    "mode": "store",
                    "discarded_at": "2024-01-15T09:30:00.000Z"
                  }
                }
              ],
              "has_more": true
            }
            """;

        Server
            .Given(WireMock.RequestBuilders.Request.Create().WithPath("/v1/emails").UsingGet())
            .RespondWith(
                WireMock
                    .ResponseBuilders.Response.Create()
                    .WithStatusCode(200)
                    .WithBody(mockResponse)
            );

        var response = await Client.Email.ListAsync(new ListEmailRequest());
        JsonAssert.AreEqual(response, mockResponse);
    }

    [NUnit.Framework.Test]
    public async Task MockServerTest_2()
    {
        const string mockResponse = """
            {
              "object": "list",
              "data": [
                {
                  "object": "email",
                  "id": "email_01k7c8m4q2f3e9v6t5r1n0p8yz",
                  "from": "Acme <onboarding@acme.com>",
                  "to": [
                    "user@example.com"
                  ],
                  "cc": [
                    "cc"
                  ],
                  "bcc": [
                    "bcc"
                  ],
                  "reply_to": [
                    "reply_to"
                  ],
                  "subject": "Welcome to Acme",
                  "tags": [
                    {
                      "name": "template",
                      "value": "welcome"
                    }
                  ],
                  "category": "onboarding",
                  "stream": "transactional",
                  "status": "sent",
                  "failure": null,
                  "recipients": [
                    {
                      "address": "user@example.com",
                      "type": "to",
                      "status": "delivered",
                      "last_event_at": "2026-10-10T12:00:02.000Z"
                    }
                  ],
                  "sandbox": false,
                  "tracking": {
                    "opens": false,
                    "clicks": false,
                    "unsubscribe": false,
                    "open_count": 0,
                    "first_opened_at": null,
                    "last_opened_at": null,
                    "click_count": 0,
                    "first_clicked_at": null,
                    "last_clicked_at": null
                  },
                  "created_at": "2026-10-10T12:00:00.000Z",
                  "sent_at": "2026-10-10T12:00:01.000Z",
                  "scheduled_at": null,
                  "batch_id": null,
                  "template": null,
                  "broadcast_id": "broadcast_id",
                  "subaccount_id": null,
                  "content_storage": {
                    "mode": "store",
                    "discarded_at": null
                  }
                }
              ],
              "has_more": false
            }
            """;

        Server
            .Given(
                WireMock
                    .RequestBuilders.Request.Create()
                    .WithPath("/v1/emails")
                    .WithParam("to", "user@example.com")
                    .UsingGet()
            )
            .RespondWith(
                WireMock
                    .ResponseBuilders.Response.Create()
                    .WithStatusCode(200)
                    .WithBody(mockResponse)
            );

        var response = await Client.Email.ListAsync(
            new ListEmailRequest { To = "user@example.com" }
        );
        JsonAssert.AreEqual(response, mockResponse);
    }
}
