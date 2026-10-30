using Coss.Inboxes;
using Coss.Test.Unit.MockServer;
using Coss.Test.Utils;
using NUnit.Framework;

namespace Coss.Test.Unit.MockServer.Inboxes.Threads;

[TestFixture]
[Parallelizable(ParallelScope.Self)]
public class DeleteTest : BaseMockServerTest
{
    [NUnit.Framework.Test]
    public async Task MockServerTest_1()
    {
        const string mockResponse = """
            {
              "object": "inbox_thread",
              "id": "id",
              "deleted": true
            }
            """;

        Server
            .Given(
                WireMock
                    .RequestBuilders.Request.Create()
                    .WithPath("/v1/inboxes/inbox_id/threads/thread_id")
                    .UsingDelete()
            )
            .RespondWith(
                WireMock
                    .ResponseBuilders.Response.Create()
                    .WithStatusCode(200)
                    .WithBody(mockResponse)
            );

        var response = await Client.Inboxes.Threads.DeleteAsync(
            new DeleteThreadsRequest { InboxId = "inbox_id", ThreadId = "thread_id" }
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
              "deleted": true
            }
            """;

        Server
            .Given(
                WireMock
                    .RequestBuilders.Request.Create()
                    .WithPath(
                        "/v1/inboxes/inbox_01k7c8m4q2f3e9v6t5r1n0p8yz/threads/thread_01k7c8m4r0c2b8w9y3d5f6g7h8"
                    )
                    .UsingDelete()
            )
            .RespondWith(
                WireMock
                    .ResponseBuilders.Response.Create()
                    .WithStatusCode(200)
                    .WithBody(mockResponse)
            );

        var response = await Client.Inboxes.Threads.DeleteAsync(
            new DeleteThreadsRequest
            {
                InboxId = "inbox_01k7c8m4q2f3e9v6t5r1n0p8yz",
                ThreadId = "thread_01k7c8m4r0c2b8w9y3d5f6g7h8",
            }
        );
        JsonAssert.AreEqual(response, mockResponse);
    }
}
