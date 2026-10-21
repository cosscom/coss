using Coss.Hooks;
using Coss.Test.Unit.MockServer;
using Coss.Test.Utils;
using global::System.Globalization;
using NUnit.Framework;

namespace Coss.Test.Unit.MockServer.Hooks.Endpoints;

[TestFixture]
[Parallelizable(ParallelScope.Self)]
public class RecoverTest : BaseMockServerTest
{
    [NUnit.Framework.Test]
    public async Task MockServerTest_1()
    {
        const string requestJson = """
            {
              "since": "2024-01-15T09:30:00.000Z"
            }
            """;

        const string mockResponse = """
            {
              "object": "hook_endpoint_recovery",
              "id": "id",
              "endpoint_id": "endpoint_id",
              "since": "2024-01-15T09:30:00.000Z",
              "until": "2024-01-15T09:30:00.000Z",
              "status": "pending",
              "requeued": 1000000,
              "created_at": "2024-01-15T09:30:00.000Z",
              "completed_at": "2024-01-15T09:30:00.000Z"
            }
            """;

        Server
            .Given(
                WireMock
                    .RequestBuilders.Request.Create()
                    .WithPath("/v1/hooks/applications/application/endpoints/endpoint_id/recover")
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

        var response = await Client.Hooks.Endpoints.RecoverAsync(
            new RecoverHookEndpointRequest
            {
                Application = "application",
                EndpointId = "endpoint_id",
                Since = DateTime.Parse(
                    "2024-01-15T09:30:00.000Z",
                    null,
                    DateTimeStyles.AdjustToUniversal
                ),
            }
        );
        JsonAssert.AreEqual(response, mockResponse);
    }

    [NUnit.Framework.Test]
    public async Task MockServerTest_2()
    {
        const string requestJson = """
            {
              "since": "2026-01-15T00:00:00.000Z"
            }
            """;

        const string mockResponse = """
            {
              "object": "hook_endpoint_recovery",
              "id": "hrec_01k7c8m4q2f3e9v6t5r1n0p8yz",
              "endpoint_id": "hep_01k7c8m4q2f3e9v6t5r1n0p8yz",
              "since": "2026-01-15T00:00:00.000Z",
              "until": "2026-01-15T09:30:00.000Z",
              "status": "pending",
              "requeued": 0,
              "created_at": "2026-01-15T09:30:00.000Z"
            }
            """;

        Server
            .Given(
                WireMock
                    .RequestBuilders.Request.Create()
                    .WithPath(
                        "/v1/hooks/applications/customer_8812/endpoints/hep_01k7c8m4q2f3e9v6t5r1n0p8yz/recover"
                    )
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

        var response = await Client.Hooks.Endpoints.RecoverAsync(
            new RecoverHookEndpointRequest
            {
                Application = "customer_8812",
                EndpointId = "hep_01k7c8m4q2f3e9v6t5r1n0p8yz",
                Since = DateTime.Parse(
                    "2026-01-15T00:00:00.000Z",
                    null,
                    DateTimeStyles.AdjustToUniversal
                ),
            }
        );
        JsonAssert.AreEqual(response, mockResponse);
    }
}
