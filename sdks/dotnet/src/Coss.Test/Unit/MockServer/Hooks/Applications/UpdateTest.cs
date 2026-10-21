using Coss.Hooks;
using Coss.Test.Unit.MockServer;
using Coss.Test.Utils;
using NUnit.Framework;

namespace Coss.Test.Unit.MockServer.Hooks.Applications;

[TestFixture]
[Parallelizable(ParallelScope.Self)]
public class UpdateTest : BaseMockServerTest
{
    [NUnit.Framework.Test]
    public async Task MockServerTest_1()
    {
        const string requestJson = """
            {
              "uid": null
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
                    .WithPath("/v1/hooks/applications/application")
                    .WithHeader("Content-Type", "application/json")
                    .UsingPatch()
                    .WithBodyAsJson(requestJson)
            )
            .RespondWith(
                WireMock
                    .ResponseBuilders.Response.Create()
                    .WithStatusCode(200)
                    .WithBody(mockResponse)
            );

        var response = await Client.Hooks.Applications.UpdateAsync(
            new UpdateHookApplicationRequest
            {
                Application = "application",
                Name = null,
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
              "name": "Acme Corporation"
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
                    .WithPath("/v1/hooks/applications/customer_8812")
                    .WithHeader("Content-Type", "application/json")
                    .UsingPatch()
                    .WithBodyAsJson(requestJson)
            )
            .RespondWith(
                WireMock
                    .ResponseBuilders.Response.Create()
                    .WithStatusCode(200)
                    .WithBody(mockResponse)
            );

        var response = await Client.Hooks.Applications.UpdateAsync(
            new UpdateHookApplicationRequest
            {
                Application = "customer_8812",
                Name = "Acme Corporation",
            }
        );
        JsonAssert.AreEqual(response, mockResponse);
    }
}
