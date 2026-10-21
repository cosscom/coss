using Coss.Hooks;
using Coss.Test.Unit.MockServer;
using Coss.Test.Utils;
using NUnit.Framework;

namespace Coss.Test.Unit.MockServer.Hooks.Applications;

[TestFixture]
[Parallelizable(ParallelScope.Self)]
public class CreateTest : BaseMockServerTest
{
    [NUnit.Framework.Test]
    public async Task MockServerTest_1()
    {
        const string requestJson = """
            {
              "name": "x"
            }
            """;

        const string mockResponse = """
            {
              "object": "hook_application",
              "id": "id",
              "uid": "uid",
              "name": "name",
              "metadata": {
                "metadata": "metadata"
              },
              "created_at": "2024-01-15T09:30:00.000Z",
              "updated_at": "2024-01-15T09:30:00.000Z"
            }
            """;

        Server
            .Given(
                WireMock
                    .RequestBuilders.Request.Create()
                    .WithPath("/v1/hooks/applications")
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

        var response = await Client.Hooks.Applications.CreateAsync(
            new CreateHookApplicationRequest
            {
                Name = "x",
                Uid = null,
                Metadata = null,
            }
        );
        JsonAssert.AreEqual(response, mockResponse);
    }

    [NUnit.Framework.Test]
    public async Task MockServerTest_2()
    {
        const string requestJson = """
            {
              "name": "Acme Corp",
              "uid": "customer_8812",
              "metadata": {
                "plan": "pro"
              }
            }
            """;

        const string mockResponse = """
            {
              "object": "hook_application",
              "id": "happ_01k7c8m4q2f3e9v6t5r1n0p8yz",
              "uid": "customer_8812",
              "name": "Acme Corp",
              "metadata": {
                "plan": "pro"
              },
              "created_at": "2026-01-15T09:30:00.000Z",
              "updated_at": "2026-01-15T09:30:00.000Z"
            }
            """;

        Server
            .Given(
                WireMock
                    .RequestBuilders.Request.Create()
                    .WithPath("/v1/hooks/applications")
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

        var response = await Client.Hooks.Applications.CreateAsync(
            new CreateHookApplicationRequest
            {
                Name = "Acme Corp",
                Uid = "customer_8812",
                Metadata = new Dictionary<string, string>() { { "plan", "pro" } },
            }
        );
        JsonAssert.AreEqual(response, mockResponse);
    }
}
