using Coss.Inboxes;
using Coss.Test.Unit.MockServer;
using Coss.Test.Utils;
using NUnit.Framework;

namespace Coss.Test.Unit.MockServer.Inboxes.Threads;

[TestFixture]
[Parallelizable(ParallelScope.Self)]
public class GetTest : BaseMockServerTest
{
    [NUnit.Framework.Test]
    public async Task MockServerTest_1()
    {
        const string mockResponse = """
            {
              "object": "inbox_thread",
              "id": "id",
              "inbox_id": "inbox_id",
              "subject": "subject",
              "participants": [
                "participants",
                "participants"
              ],
              "message_count": 1000000,
              "preview": "preview",
              "last_message_at": "2024-01-15T09:30:00.000Z",
              "last_inbound_at": "2024-01-15T09:30:00.000Z",
              "created_at": "2024-01-15T09:30:00.000Z",
              "messages": [
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
                  "created_at": "2024-01-15T09:30:00.000Z",
                  "reply_to": [
                    "reply_to",
                    "reply_to"
                  ],
                  "message_id": "message_id",
                  "in_reply_to": "in_reply_to",
                  "references": [
                    "references",
                    "references"
                  ],
                  "text": "text",
                  "extracted_text": "extracted_text",
                  "html": "html",
                  "truncated": true
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
                  "created_at": "2024-01-15T09:30:00.000Z",
                  "reply_to": [
                    "reply_to",
                    "reply_to"
                  ],
                  "message_id": "message_id",
                  "in_reply_to": "in_reply_to",
                  "references": [
                    "references",
                    "references"
                  ],
                  "text": "text",
                  "extracted_text": "extracted_text",
                  "html": "html",
                  "truncated": true
                }
              ]
            }
            """;

        Server
            .Given(
                WireMock
                    .RequestBuilders.Request.Create()
                    .WithPath("/v1/inboxes/inbox_id/threads/thread_id")
                    .UsingGet()
            )
            .RespondWith(
                WireMock
                    .ResponseBuilders.Response.Create()
                    .WithStatusCode(200)
                    .WithBody(mockResponse)
            );

        var response = await Client.Inboxes.Threads.GetAsync(
            new GetThreadsRequest { InboxId = "inbox_id", ThreadId = "thread_id" }
        );
        JsonAssert.AreEqual(response, mockResponse);
    }

    [NUnit.Framework.Test]
    public async Task MockServerTest_2()
    {
        const string mockResponse = """
            {
              "object": "inbox_thread",
              "id": "thread_01k7c8m4r0c2b8w9y3d5f6g7h8",
              "inbox_id": "inbox_01k7c8m4q2f3e9v6t5r1n0p8yz",
              "subject": "My order arrived damaged",
              "participants": [
                "jane@example.com"
              ],
              "message_count": 2,
              "preview": "Sorry about that, Jane! A new one is on its way.",
              "last_message_at": "2026-10-10T12:01:00.000Z",
              "last_inbound_at": "2026-10-10T12:00:00.000Z",
              "created_at": "2026-10-10T12:00:00.000Z",
              "messages": [
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
                  "created_at": "2026-10-10T12:00:00.000Z",
                  "reply_to": [
                    "reply_to"
                  ],
                  "message_id": "<CAF3k2m9qp4ld8sv@mail.example.com>",
                  "in_reply_to": null,
                  "references": [
                    "references"
                  ],
                  "text": "Hi, the order arrived damaged. Can you send a new one?\n\nJane",
                  "extracted_text": "Hi, the order arrived damaged. Can you send a new one?\n\nJane",
                  "html": null,
                  "truncated": false
                },
                {
                  "object": "inbox_message",
                  "id": "imsg_01k7c8m5t2e4d0y1a5f7h8j9k0",
                  "inbox_id": "inbox_01k7c8m4q2f3e9v6t5r1n0p8yz",
                  "thread_id": "thread_01k7c8m4r0c2b8w9y3d5f6g7h8",
                  "direction": "outbound",
                  "status": "queued",
                  "from": "\"Acme Support\" <support-agent@k3j9x2m7qp4l.inbound.coss.com>",
                  "to": [
                    "jane@example.com"
                  ],
                  "cc": [
                    "cc"
                  ],
                  "subject": "Re: My order arrived damaged",
                  "preview": "Sorry about that, Jane! A new one is on its way.",
                  "attachments": [
                    {
                      "id": "rcvdatt_01k7c8m4r0c2b8w9y3d5f6g7h8",
                      "filename": "invoice.pdf",
                      "content_type": "application/pdf",
                      "content_id": null,
                      "disposition": "attachment",
                      "size": 48213
                    }
                  ],
                  "spam": false,
                  "received_email_id": null,
                  "email_id": "email_01k7c8m5t2e4d0y1a5f7h8j9k0",
                  "created_at": "2026-10-10T12:01:00.000Z",
                  "reply_to": [
                    "reply_to"
                  ],
                  "message_id": null,
                  "in_reply_to": "<CAF3k2m9qp4ld8sv@mail.example.com>",
                  "references": [
                    "<CAF3k2m9qp4ld8sv@mail.example.com>"
                  ],
                  "text": "Sorry about that, Jane! A new one is on its way.",
                  "extracted_text": "Sorry about that, Jane! A new one is on its way.",
                  "html": null,
                  "truncated": false
                }
              ]
            }
            """;

        Server
            .Given(
                WireMock
                    .RequestBuilders.Request.Create()
                    .WithPath(
                        "/v1/inboxes/inbox_01k7c8m4q2f3e9v6t5r1n0p8yz/threads/thread_01k7c8m4r0c2b8w9y3d5f6g7h8"
                    )
                    .UsingGet()
            )
            .RespondWith(
                WireMock
                    .ResponseBuilders.Response.Create()
                    .WithStatusCode(200)
                    .WithBody(mockResponse)
            );

        var response = await Client.Inboxes.Threads.GetAsync(
            new GetThreadsRequest
            {
                InboxId = "inbox_01k7c8m4q2f3e9v6t5r1n0p8yz",
                ThreadId = "thread_01k7c8m4r0c2b8w9y3d5f6g7h8",
            }
        );
        JsonAssert.AreEqual(response, mockResponse);
    }
}
