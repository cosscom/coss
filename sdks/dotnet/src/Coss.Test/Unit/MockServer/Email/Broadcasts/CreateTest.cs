using Coss.Email;
using Coss.Test.Unit.MockServer;
using Coss.Test.Utils;
using global::System.Globalization;
using NUnit.Framework;

namespace Coss.Test.Unit.MockServer.Email.Broadcasts;

[TestFixture]
[Parallelizable(ParallelScope.Self)]
public class CreateTest : BaseMockServerTest
{
    [NUnit.Framework.Test]
    public async Task MockServerTest_1()
    {
        const string requestJson = """
            {
              "name": "x",
              "from": "from",
              "subject": "x"
            }
            """;

        const string mockResponse = """
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
            """;

        Server
            .Given(
                WireMock
                    .RequestBuilders.Request.Create()
                    .WithPath("/v1/broadcasts")
                    .WithHeader("Content-Type", "application/json")
                    .UsingPost()
                    .WithBodyAsJson(requestJson)
            )
            .RespondWith(
                WireMock
                    .ResponseBuilders.Response.Create()
                    .WithStatusCode(200)
                    .WithBody(mockResponse)
            );

        var response = await Client.Email.Broadcasts.CreateAsync(
            new CreateBroadcastRequest
            {
                Name = "x",
                AudienceId = null,
                SegmentId = null,
                Topic = null,
                From = "from",
                ReplyTo = null,
                Subject = "x",
                PreviewText = null,
                Html = null,
                Text = null,
                Tracking = null,
                RatePerSecond = null,
                Send = null,
                ScheduledAt = null,
            }
        );
        JsonAssert.AreEqual(response, mockResponse);
    }

    [NUnit.Framework.Test]
    public async Task MockServerTest_2()
    {
        const string requestJson = """
            {
              "name": "October newsletter",
              "segment_id": "seg_01k7c8m4q2f3e9v6t5r1n0p8yz",
              "topic": "newsletter",
              "from": "Acme <news@acme.com>",
              "subject": "What's new, {{{contact.first_name|there}}}",
              "html": "<p>Hi {{{contact.first_name|there}}},</p><p>…</p><p><a href=\"{{{unsubscribe_url}}}\">Unsubscribe</a></p>",
              "scheduled_at": "2026-10-20T09:00:00.000Z"
            }
            """;

        const string mockResponse = """
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
            """;

        Server
            .Given(
                WireMock
                    .RequestBuilders.Request.Create()
                    .WithPath("/v1/broadcasts")
                    .WithHeader("Idempotency-Key", "welcome-user-123")
                    .WithHeader("Content-Type", "application/json")
                    .UsingPost()
                    .WithBodyAsJson(requestJson)
            )
            .RespondWith(
                WireMock
                    .ResponseBuilders.Response.Create()
                    .WithStatusCode(200)
                    .WithBody(mockResponse)
            );

        var response = await Client.Email.Broadcasts.CreateAsync(
            new CreateBroadcastRequest
            {
                IdempotencyKey = "welcome-user-123",
                Name = "October newsletter",
                SegmentId = "seg_01k7c8m4q2f3e9v6t5r1n0p8yz",
                Topic = "newsletter",
                From = "Acme <news@acme.com>",
                Subject = "What's new, {{{contact.first_name|there}}}",
                Html =
                    "<p>Hi {{{contact.first_name|there}}},</p><p>…</p><p><a href=\"{{{unsubscribe_url}}}\">Unsubscribe</a></p>",
                ScheduledAt = DateTime.Parse(
                    "2026-10-20T09:00:00.000Z",
                    null,
                    DateTimeStyles.AdjustToUniversal
                ),
            }
        );
        JsonAssert.AreEqual(response, mockResponse);
    }
}
