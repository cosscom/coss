using Coss;
using Coss.Test.Unit.MockServer;
using Coss.Test.Utils;
using NUnit.Framework;

namespace Coss.Test.Unit.MockServer.Inboxes;

[TestFixture]
[Parallelizable(ParallelScope.Self)]
public class CreateTest : BaseMockServerTest
{
    [NUnit.Framework.Test]
    public async Task MockServerTest_1()
    {
        const string requestJson = """
            {}
            """;

        const string mockResponse = """
            {
              "object": "inbox",
              "id": "id",
              "address": "address",
              "username": "username",
              "domain": "domain",
              "kind": "managed",
              "display_name": "display_name",
              "client_id": "client_id",
              "can_send": true,
              "sandbox": true,
              "created_at": "2024-01-15T09:30:00.000Z",
              "updated_at": "2024-01-15T09:30:00.000Z"
            }
            """;

        Server
            .Given(
                WireMock
                    .RequestBuilders.Request.Create()
                    .WithPath("/v1/inboxes")
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

        var response = await Client.Inboxes.CreateAsync(
            new CreateInboxRequest
            {
                Username = null,
                Domain = null,
                DisplayName = null,
                ClientId = null,
            }
        );
        JsonAssert.AreEqual(response, mockResponse);
    }

    [NUnit.Framework.Test]
    public async Task MockServerTest_2()
    {
        const string requestJson = """
            {
              "username": "support-agent",
              "display_name": "Acme Support",
              "client_id": "agent-42"
            }
            """;

        const string mockResponse = """
            {
              "object": "inbox",
              "id": "inbox_01k7c8m4q2f3e9v6t5r1n0p8yz",
              "address": "support-agent@k3j9x2m7qp4l.inbound.coss.com",
              "username": "support-agent",
              "domain": "k3j9x2m7qp4l.inbound.coss.com",
              "kind": "managed",
              "display_name": "Acme Support",
              "client_id": "agent-42",
              "can_send": true,
              "sandbox": true,
              "created_at": "2026-10-10T12:00:00.000Z",
              "updated_at": "2026-10-10T12:00:00.000Z"
            }
            """;

        Server
            .Given(
                WireMock
                    .RequestBuilders.Request.Create()
                    .WithPath("/v1/inboxes")
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

        var response = await Client.Inboxes.CreateAsync(
            new CreateInboxRequest
            {
                Username = "support-agent",
                DisplayName = "Acme Support",
                ClientId = "agent-42",
            }
        );
        JsonAssert.AreEqual(response, mockResponse);
    }
}
