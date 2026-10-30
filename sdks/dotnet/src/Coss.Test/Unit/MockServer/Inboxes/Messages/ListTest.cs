using Coss.Test.Unit.MockServer;
using Coss.Test.Utils;
using NUnit.Framework;

namespace Coss.Test.Unit.MockServer.Inboxes.Messages;

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
                  "object": "inbox_message",
                  "id": "id",
                  "inbox_id": "inbox_id",
                  "thread_id": "thread_id",
                  "direction": "inbound",
                  "status": "received",
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
                  "preview": "preview",
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
                  "spam": true,
                  "received_email_id": "received_email_id",
                  "email_id": "email_id",
                  "created_at": "2024-01-15T09:30:00.000Z"
                },
                {
                  "object": "inbox_message",
                  "id": "id",
                  "inbox_id": "inbox_id",
                  "thread_id": "thread_id",
                  "direction": "inbound",
                  "status": "received",
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
                  "preview": "preview",
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
                  "spam": true,
                  "received_email_id": "received_email_id",
                  "email_id": "email_id",
                  "created_at": "2024-01-15T09:30:00.000Z"
                }
              ],
              "has_more": true
            }
            """;

        Server
            .Given(
                WireMock
                    .RequestBuilders.Request.Create()
                    .WithPath("/v1/inboxes/inbox_id/messages")
                    .UsingGet()
            )
            .RespondWith(
                WireMock
                    .ResponseBuilders.Response.Create()
                    .WithStatusCode(200)
                    .WithBody(mockResponse)
            );

        var response = await Client.Inboxes.Messages.ListAsync(
            new Coss.Inboxes.ListMessagesRequest { InboxId = "inbox_id" }
        );
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
                  "object": "inbox_message",
                  "id": "imsg_01k7c8m4s1d3c9x0z4e6g7h8j9",
                  "inbox_id": "inbox_01k7c8m4q2f3e9v6t5r1n0p8yz",
                  "thread_id": "thread_01k7c8m4r0c2b8w9y3d5f6g7h8",
                  "direction": "inbound",
                  "status": "received",
                  "from": "Jane Doe <jane@example.com>",
                  "to": [
                    "support-agent@k3j9x2m7qp4l.inbound.coss.com"
                  ],
                  "cc": [
                    "cc"
                  ],
                  "subject": "My order arrived damaged",
                  "preview": "Hi, the order arrived damaged. Can you send a new one?",
                  "attachments": [
                    {
                      "id": "rcvdatt_01k7c8m4r0c2b8w9y3d5f6g7h8",
                      "filename": "photo.jpg",
                      "content_type": "image/jpeg",
                      "content_id": null,
                      "disposition": "attachment",
                      "size": 48213
                    }
                  ],
                  "spam": false,
                  "received_email_id": "rcvd_01k7c8m4q2f3e9v6t5r1n0p8yz",
                  "email_id": null,
                  "created_at": "2026-10-10T12:00:00.000Z"
                }
              ],
              "has_more": false
            }
            """;

        Server
            .Given(
                WireMock
                    .RequestBuilders.Request.Create()
                    .WithPath("/v1/inboxes/inbox_01k7c8m4q2f3e9v6t5r1n0p8yz/messages")
                    .UsingGet()
            )
            .RespondWith(
                WireMock
                    .ResponseBuilders.Response.Create()
                    .WithStatusCode(200)
                    .WithBody(mockResponse)
            );

        var response = await Client.Inboxes.Messages.ListAsync(
            new Coss.Inboxes.ListMessagesRequest { InboxId = "inbox_01k7c8m4q2f3e9v6t5r1n0p8yz" }
        );
        JsonAssert.AreEqual(response, mockResponse);
    }
}
