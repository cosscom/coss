using Coss.Email;
using Coss.Test.Unit.MockServer;
using Coss.Test.Utils;
using NUnit.Framework;

namespace Coss.Test.Unit.MockServer.Email.Received;

[TestFixture]
[Parallelizable(ParallelScope.Self)]
public class GetTest : BaseMockServerTest
{
    [NUnit.Framework.Test]
    public async Task MockServerTest_1()
    {
        const string mockResponse = """
            {
              "object": "received_email",
              "id": "id",
              "status": "received",
              "blocked_reason": "virus",
              "mail_from": "mail_from",
              "recipients": [
                "recipients",
                "recipients"
              ],
              "from": "from",
              "to": [
                "to",
                "to"
              ],
              "cc": [
                "cc",
                "cc"
              ],
              "subject": "subject",
              "message_id": "message_id",
              "attachments": [
                {
                  "id": "id",
                  "filename": "filename",
                  "content_type": "content_type",
                  "content_id": "content_id",
                  "disposition": "attachment",
                  "size": 1000000
                },
                {
                  "id": "id",
                  "filename": "filename",
                  "content_type": "content_type",
                  "content_id": "content_id",
                  "disposition": "attachment",
                  "size": 1000000
                }
              ],
              "size": 1000000,
              "spam": true,
              "verdicts": {
                "spam": "pass",
                "virus": "pass",
                "spf": "pass",
                "dkim": "pass",
                "dmarc": "pass",
                "dmarc_policy": "dmarc_policy"
              },
              "sandbox": true,
              "received_at": "2024-01-15T09:30:00.000Z",
              "reply_to": [
                "reply_to",
                "reply_to"
              ],
              "in_reply_to": "in_reply_to",
              "references": [
                "references",
                "references"
              ],
              "sent_at": "2024-01-15T09:30:00.000Z",
              "headers": [
                {
                  "name": "name",
                  "value": "value"
                },
                {
                  "name": "name",
                  "value": "value"
                }
              ],
              "text": "text",
              "html": "html",
              "truncated": true
            }
            """;

        Server
            .Given(
                WireMock
                    .RequestBuilders.Request.Create()
                    .WithPath("/v1/received_emails/id")
                    .UsingGet()
            )
            .RespondWith(
                WireMock
                    .ResponseBuilders.Response.Create()
                    .WithStatusCode(200)
                    .WithBody(mockResponse)
            );

        var response = await Client.Email.Received.GetAsync(new GetReceivedRequest { Id = "id" });
        JsonAssert.AreEqual(response, mockResponse);
    }

    [NUnit.Framework.Test]
    public async Task MockServerTest_2()
    {
        const string mockResponse = """
            {
              "object": "received_email",
              "id": "rcvd_01k7c8m4q2f3e9v6t5r1n0p8yz",
              "status": "received",
              "mail_from": "jane@example.com",
              "recipients": [
                "support@inbound.acme.com"
              ],
              "from": "Jane Doe <jane@example.com>",
              "to": [
                "support@inbound.acme.com"
              ],
              "cc": [
                "cc"
              ],
              "subject": "Re: Your order",
              "message_id": "<CAF3k2m9qp4ld8sv@mail.example.com>",
              "attachments": [
                {
                  "id": "rcvdatt_01k7c8m4r0c2b8w9y3d5f6g7h8",
                  "filename": "invoice.pdf",
                  "content_type": "application/pdf",
                  "disposition": "attachment",
                  "size": 48213
                }
              ],
              "size": 61432,
              "spam": false,
              "verdicts": {
                "spam": "pass",
                "virus": "pass",
                "spf": "pass",
                "dkim": "pass",
                "dmarc": "pass"
              },
              "sandbox": false,
              "received_at": "2026-10-10T12:00:00.000Z",
              "reply_to": [
                "reply_to"
              ],
              "in_reply_to": "<x7f3k2m9qp4ld8sv@acme.com>",
              "references": [
                "<x7f3k2m9qp4ld8sv@acme.com>"
              ],
              "sent_at": "2026-10-10T11:59:58.000Z",
              "headers": [
                {
                  "name": "From",
                  "value": "Jane Doe <jane@example.com>"
                },
                {
                  "name": "To",
                  "value": "support@inbound.acme.com"
                },
                {
                  "name": "Subject",
                  "value": "Re: Your order"
                }
              ],
              "text": "Hi, the order arrived damaged.",
              "html": "<p>Hi, the order arrived damaged.</p>",
              "truncated": false
            }
            """;

        Server
            .Given(
                WireMock
                    .RequestBuilders.Request.Create()
                    .WithPath("/v1/received_emails/rcvd_01k7c8m4q2f3e9v6t5r1n0p8yz")
                    .UsingGet()
            )
            .RespondWith(
                WireMock
                    .ResponseBuilders.Response.Create()
                    .WithStatusCode(200)
                    .WithBody(mockResponse)
            );

        var response = await Client.Email.Received.GetAsync(
            new GetReceivedRequest { Id = "rcvd_01k7c8m4q2f3e9v6t5r1n0p8yz" }
        );
        JsonAssert.AreEqual(response, mockResponse);
    }
}
