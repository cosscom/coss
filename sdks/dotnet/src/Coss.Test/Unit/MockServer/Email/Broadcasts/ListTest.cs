using Coss.Email;
using Coss.Test.Unit.MockServer;
using Coss.Test.Utils;
using NUnit.Framework;

namespace Coss.Test.Unit.MockServer.Email.Broadcasts;

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
                  "object": "broadcast",
                  "id": "id",
                  "name": "name",
                  "status": "draft",
                  "audience_id": "audience_id",
                  "segment_id": "segment_id",
                  "topic": "topic",
                  "from": "from",
                  "reply_to": [
                    "reply_to",
                    "reply_to"
                  ],
                  "subject": "subject",
                  "preview_text": "preview_text",
                  "html": "html",
                  "text": "text",
                  "tracking": {
                    "opens": true,
                    "clicks": true
                  },
                  "rate_per_second": 1000000,
                  "scheduled_at": "2024-01-15T09:30:00.000Z",
                  "started_at": "2024-01-15T09:30:00.000Z",
                  "completed_at": "2024-01-15T09:30:00.000Z",
                  "canceled_at": "2024-01-15T09:30:00.000Z",
                  "recipients_estimated": 1000000,
                  "pause_reason": "pause_reason",
                  "error": {
                    "code": "code",
                    "message": "message"
                  },
                  "stats": {
                    "recipients": 1000000,
                    "sent": 1000000,
                    "delivered": 1000000,
                    "bounced": 1000000,
                    "complained": 1000000,
                    "failed": 1000000,
                    "opened": 1000000,
                    "clicked": 1000000,
                    "unsubscribed": 1000000
                  },
                  "created_at": "2024-01-15T09:30:00.000Z",
                  "updated_at": "2024-01-15T09:30:00.000Z"
                },
                {
                  "object": "broadcast",
                  "id": "id",
                  "name": "name",
                  "status": "draft",
                  "audience_id": "audience_id",
                  "segment_id": "segment_id",
                  "topic": "topic",
                  "from": "from",
                  "reply_to": [
                    "reply_to",
                    "reply_to"
                  ],
                  "subject": "subject",
                  "preview_text": "preview_text",
                  "html": "html",
                  "text": "text",
                  "tracking": {
                    "opens": true,
                    "clicks": true
                  },
                  "rate_per_second": 1000000,
                  "scheduled_at": "2024-01-15T09:30:00.000Z",
                  "started_at": "2024-01-15T09:30:00.000Z",
                  "completed_at": "2024-01-15T09:30:00.000Z",
                  "canceled_at": "2024-01-15T09:30:00.000Z",
                  "recipients_estimated": 1000000,
                  "pause_reason": "pause_reason",
                  "error": {
                    "code": "code",
                    "message": "message"
                  },
                  "stats": {
                    "recipients": 1000000,
                    "sent": 1000000,
                    "delivered": 1000000,
                    "bounced": 1000000,
                    "complained": 1000000,
                    "failed": 1000000,
                    "opened": 1000000,
                    "clicked": 1000000,
                    "unsubscribed": 1000000
                  },
                  "created_at": "2024-01-15T09:30:00.000Z",
                  "updated_at": "2024-01-15T09:30:00.000Z"
                }
              ],
              "has_more": true
            }
            """;

        Server
            .Given(WireMock.RequestBuilders.Request.Create().WithPath("/v1/broadcasts").UsingGet())
            .RespondWith(
                WireMock
                    .ResponseBuilders.Response.Create()
                    .WithStatusCode(200)
                    .WithBody(mockResponse)
            );

        var response = await Client.Email.Broadcasts.ListAsync(new ListBroadcastsRequest());
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
                  "object": "broadcast",
                  "id": "bcast_01k7c8m4q2f3e9v6t5r1n0p8yz",
                  "name": "October newsletter",
                  "status": "sent",
                  "audience_id": null,
                  "segment_id": "seg_01k7c8m4q2f3e9v6t5r1n0p8yz",
                  "topic": "newsletter",
                  "from": "Acme <news@acme.com>",
                  "reply_to": [
                    "reply_to"
                  ],
                  "subject": "What's new, {{{contact.first_name|there}}}",
                  "preview_text": null,
                  "html": "<p>Hi {{{contact.first_name|there}}},</p>",
                  "text": null,
                  "tracking": {
                    "opens": true,
                    "clicks": true
                  },
                  "rate_per_second": null,
                  "scheduled_at": "2026-10-20T09:00:00.000Z",
                  "started_at": "2026-10-20T09:00:01.000Z",
                  "completed_at": "2026-10-20T09:12:40.000Z",
                  "canceled_at": null,
                  "recipients_estimated": 1200,
                  "pause_reason": null,
                  "error": null,
                  "stats": {
                    "recipients": 1200,
                    "sent": 1200,
                    "delivered": 1180,
                    "bounced": 6,
                    "complained": 1,
                    "failed": 0,
                    "opened": 540,
                    "clicked": 120,
                    "unsubscribed": 4
                  },
                  "created_at": "2026-10-15T12:00:00.000Z",
                  "updated_at": "2026-10-20T09:12:40.000Z"
                }
              ],
              "has_more": false
            }
            """;

        Server
            .Given(WireMock.RequestBuilders.Request.Create().WithPath("/v1/broadcasts").UsingGet())
            .RespondWith(
                WireMock
                    .ResponseBuilders.Response.Create()
                    .WithStatusCode(200)
                    .WithBody(mockResponse)
            );

        var response = await Client.Email.Broadcasts.ListAsync(new ListBroadcastsRequest());
        JsonAssert.AreEqual(response, mockResponse);
    }
}
