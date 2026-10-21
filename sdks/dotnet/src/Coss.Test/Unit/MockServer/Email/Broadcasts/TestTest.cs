using Coss.Email;
using Coss.Test.Unit.MockServer;
using Coss.Test.Utils;
using NUnit.Framework;

namespace Coss.Test.Unit.MockServer.Email.Broadcasts;

[TestFixture]
[Parallelizable(ParallelScope.Self)]
public class TestTest : BaseMockServerTest
{
    [NUnit.Framework.Test]
    public async Task MockServerTest_1()
    {
        const string requestJson = """
            {
              "to": [
                "to",
                "to"
              ]
            }
            """;

        const string mockResponse = """
            {
              "object": "broadcast_test",
              "email_ids": [
                "email_ids",
                "email_ids"
              ]
            }
            """;

        Server
            .Given(
                WireMock
                    .RequestBuilders.Request.Create()
                    .WithPath("/v1/broadcasts/id/test")
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

        var response = await Client.Email.Broadcasts.TestAsync(
            new TestBroadcastRequest
            {
                Id = "id",
                To = new List<string>() { "to", "to" },
                Contact = null,
            }
        );
        JsonAssert.AreEqual(response, mockResponse);
    }

    [NUnit.Framework.Test]
    public async Task MockServerTest_2()
    {
        const string requestJson = """
            {
              "to": [
                "me@acme.com"
              ]
            }
            """;

        const string mockResponse = """
            {
              "object": "broadcast_test",
              "email_ids": [
                "email_01k7c8m4q2f3e9v6t5r1n0p8yz"
              ]
            }
            """;

        Server
            .Given(
                WireMock
                    .RequestBuilders.Request.Create()
                    .WithPath("/v1/broadcasts/bcast_01k7c8m4q2f3e9v6t5r1n0p8yz/test")
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

        var response = await Client.Email.Broadcasts.TestAsync(
            new TestBroadcastRequest
            {
                Id = "bcast_01k7c8m4q2f3e9v6t5r1n0p8yz",
                To = new List<string>() { "me@acme.com" },
            }
        );
        JsonAssert.AreEqual(response, mockResponse);
    }
}
