using Coss.Inboxes;
using Coss.Test.Unit.MockServer;
using Coss.Test.Utils;
using NUnit.Framework;

namespace Coss.Test.Unit.MockServer.Inboxes.Threads;

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
                  "created_at": "2024-01-15T09:30:00.000Z"
                },
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
                    .WithPath("/v1/inboxes/inbox_id/threads")
                    .UsingGet()
            )
            .RespondWith(
                WireMock
                    .ResponseBuilders.Response.Create()
                    .WithStatusCode(200)
                    .WithBody(mockResponse)
            );

        var response = await Client.Inboxes.Threads.ListAsync(
            new ListThreadsRequest { InboxId = "inbox_id" }
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
                    .WithPath("/v1/inboxes/inbox_01k7c8m4q2f3e9v6t5r1n0p8yz/threads")
                    .UsingGet()
            )
            .RespondWith(
                WireMock
                    .ResponseBuilders.Response.Create()
                    .WithStatusCode(200)
                    .WithBody(mockResponse)
            );

        var response = await Client.Inboxes.Threads.ListAsync(
            new ListThreadsRequest { InboxId = "inbox_01k7c8m4q2f3e9v6t5r1n0p8yz" }
        );
        JsonAssert.AreEqual(response, mockResponse);
    }
}
