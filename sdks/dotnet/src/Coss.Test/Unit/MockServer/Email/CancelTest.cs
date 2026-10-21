using Coss;
using Coss.Test.Unit.MockServer;
using Coss.Test.Utils;
using NUnit.Framework;

namespace Coss.Test.Unit.MockServer.Email;

[TestFixture]
[Parallelizable(ParallelScope.Self)]
public class CancelTest : BaseMockServerTest
{
    [NUnit.Framework.Test]
    public async Task MockServerTest_1()
    {
        const string mockResponse = """
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
              "broadcast_id": "broadcast_id"
            }
            """;

        Server
            .Given(
                WireMock
                    .RequestBuilders.Request.Create()
                    .WithPath("/v1/emails/id/cancel")
                    .UsingPost()
            )
            .RespondWith(
                WireMock
                    .ResponseBuilders.Response.Create()
                    .WithStatusCode(200)
                    .WithBody(mockResponse)
            );

        var response = await Client.Email.CancelAsync(new CancelEmailRequest { Id = "id" });
        JsonAssert.AreEqual(response, mockResponse);
    }

    [NUnit.Framework.Test]
    public async Task MockServerTest_2()
    {
        const string mockResponse = """
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
              "html": "<p>Thanks for signing up!</p>",
              "headers": {
                "key": "value"
              },
              "tags": [
                {
                  "name": "template",
                  "value": "welcome"
                }
              ],
              "category": "onboarding",
              "stream": "transactional",
              "status": "sent",
              "recipients": [
                {
                  "address": "user@example.com",
                  "type": "to",
                  "status": "delivered",
                  "last_event_at": "2026-10-10T12:00:02.000Z"
                }
              ],
              "attachments": [
                {
                  "id": "att_01k7c8m4q2f3e9v6t5r1n0p8yz",
                  "filename": "filename",
                  "content_type": "content_type",
                  "content_id": "content_id",
                  "size": 1000000
                }
              ],
              "sandbox": false,
              "tracking": {
                "opens": false,
                "clicks": false,
                "unsubscribe": false,
                "open_count": 0,
                "click_count": 0
              },
              "created_at": "2026-10-10T12:00:00.000Z",
              "sent_at": "2026-10-10T12:00:01.000Z"
            }
            """;

        Server
            .Given(
                WireMock
                    .RequestBuilders.Request.Create()
                    .WithPath("/v1/emails/email_01k7c8m4q2f3e9v6t5r1n0p8yz/cancel")
                    .UsingPost()
            )
            .RespondWith(
                WireMock
                    .ResponseBuilders.Response.Create()
                    .WithStatusCode(200)
                    .WithBody(mockResponse)
            );

        var response = await Client.Email.CancelAsync(
            new CancelEmailRequest { Id = "email_01k7c8m4q2f3e9v6t5r1n0p8yz" }
        );
        JsonAssert.AreEqual(response, mockResponse);
    }
}
