using Coss.Hooks;
using Coss.Test.Unit.MockServer;
using Coss.Test.Utils;
using NUnit.Framework;

namespace Coss.Test.Unit.MockServer.Hooks.Endpoints;

[TestFixture]
[Parallelizable(ParallelScope.Self)]
public class GetRecoveryTest : BaseMockServerTest
{
    [NUnit.Framework.Test]
    public async Task MockServerTest_1()
    {
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
                    .WithPath(
                        "/v1/hooks/applications/application/endpoints/endpoint_id/recoveries/recovery_id"
                    )
                    .UsingGet()
            )
            .RespondWith(
                WireMock
                    .ResponseBuilders.Response.Create()
                    .WithStatusCode(200)
                    .WithBody(mockResponse)
            );

        var response = await Client.Hooks.Endpoints.GetRecoveryAsync(
            new GetRecoveryEndpointsRequest
            {
                Application = "application",
                EndpointId = "endpoint_id",
                RecoveryId = "recovery_id",
            }
        );
        JsonAssert.AreEqual(response, mockResponse);
    }

    [NUnit.Framework.Test]
    public async Task MockServerTest_2()
    {
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
                        "/v1/hooks/applications/customer_8812/endpoints/hep_01k7c8m4q2f3e9v6t5r1n0p8yz/recoveries/hrec_01k7c8m4q2f3e9v6t5r1n0p8yz"
                    )
                    .UsingGet()
            )
            .RespondWith(
                WireMock
                    .ResponseBuilders.Response.Create()
                    .WithStatusCode(200)
                    .WithBody(mockResponse)
            );

        var response = await Client.Hooks.Endpoints.GetRecoveryAsync(
            new GetRecoveryEndpointsRequest
            {
                Application = "customer_8812",
                EndpointId = "hep_01k7c8m4q2f3e9v6t5r1n0p8yz",
                RecoveryId = "hrec_01k7c8m4q2f3e9v6t5r1n0p8yz",
            }
        );
        JsonAssert.AreEqual(response, mockResponse);
    }
}
