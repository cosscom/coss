using Coss;
using Coss.Test.Unit.MockServer;
using Coss.Test.Utils;
using NUnit.Framework;

namespace Coss.Test.Unit.MockServer.Email;

[TestFixture]
[Parallelizable(ParallelScope.Self)]
public class GetBatchTest : BaseMockServerTest
{
    [NUnit.Framework.Test]
    public async Task MockServerTest_1()
    {
        const string mockResponse = """
            {
              "object": "email_batch",
              "id": "id",
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
                  "html": "html",
                  "text": "text",
                  "headers": {
                    "headers": "headers"
                  },
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
                  "attachments": [
                    {
                      "id": "id",
                      "filename": "filename",
                      "content_type": "content_type",
                      "content_id": "content_id",
                      "size": 1000000
                    },
                    {
                      "id": "id",
                      "filename": "filename",
                      "content_type": "content_type",
                      "content_id": "content_id",
                      "size": 1000000
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
                  "html": "html",
                  "text": "text",
                  "headers": {
                    "headers": "headers"
                  },
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
                  "attachments": [
                    {
                      "id": "id",
                      "filename": "filename",
                      "content_type": "content_type",
                      "content_id": "content_id",
                      "size": 1000000
                    },
                    {
                      "id": "id",
                      "filename": "filename",
                      "content_type": "content_type",
                      "content_id": "content_id",
                      "size": 1000000
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
              "created_at": "2024-01-15T09:30:00.000Z"
            }
            """;

        Server
            .Given(
                WireMock.RequestBuilders.Request.Create().WithPath("/v1/emails/batch/id").UsingGet()
            )
            .RespondWith(
                WireMock
                    .ResponseBuilders.Response.Create()
                    .WithStatusCode(200)
                    .WithBody(mockResponse)
            );

        var response = await Client.Email.GetBatchAsync(new GetBatchEmailRequest { Id = "id" });
        JsonAssert.AreEqual(response, mockResponse);
    }

    [NUnit.Framework.Test]
    public async Task MockServerTest_2()
    {
        const string mockResponse = """
            {
              "object": "email_batch",
              "id": "batch_01k8d0n6x5f3w2e1r9t7y4u6i8",
              "data": [
                {
                  "object": "email",
                  "id": "email_01k7c8m4q2f3e9v6t5r1n0p8yz",
                  "from": "Acme <notifications@acme.com>",
                  "to": [
                    "ada@example.com"
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
                  "subject": "Your weekly summary",
                  "html": "<p>Hi Ada, here is your week.</p>",
                  "text": null,
                  "headers": {
                    "key": "value"
                  },
                  "tags": [
                    {
                      "name": "name",
                      "value": "value"
                    }
                  ],
                  "category": "digest",
                  "stream": "transactional",
                  "status": "queued",
                  "failure": null,
                  "recipients": [
                    {
                      "address": "ada@example.com",
                      "type": "to",
                      "status": "queued",
                      "last_event_at": null
                    }
                  ],
                  "attachments": [
                    {
                      "id": "att_01k7c8m4q2f3e9v6t5r1n0p8yz",
                      "filename": "filename",
                      "content_type": "content_type",
                      "content_id": null,
                      "size": 1000000
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
                  "sent_at": null,
                  "scheduled_at": null,
                  "batch_id": "batch_01k8d0n6x5f3w2e1r9t7y4u6i8",
                  "template": null,
                  "broadcast_id": null,
                  "subaccount_id": null,
                  "content_storage": {
                    "mode": "store",
                    "discarded_at": null
                  }
                }
              ],
              "created_at": "2026-10-10T12:00:00.000Z"
            }
            """;

        Server
            .Given(
                WireMock
                    .RequestBuilders.Request.Create()
                    .WithPath("/v1/emails/batch/batch_01k8d0n6x5f3w2e1r9t7y4u6i8")
                    .UsingGet()
            )
            .RespondWith(
                WireMock
                    .ResponseBuilders.Response.Create()
                    .WithStatusCode(200)
                    .WithBody(mockResponse)
            );

        var response = await Client.Email.GetBatchAsync(
            new GetBatchEmailRequest { Id = "batch_01k8d0n6x5f3w2e1r9t7y4u6i8" }
        );
        JsonAssert.AreEqual(response, mockResponse);
    }
}
