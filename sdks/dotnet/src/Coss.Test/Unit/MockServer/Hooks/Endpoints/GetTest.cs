using Coss.Hooks;
using Coss.Test.Unit.MockServer;
using Coss.Test.Utils;
using NUnit.Framework;

namespace Coss.Test.Unit.MockServer.Hooks.Endpoints;

[TestFixture]
[Parallelizable(ParallelScope.Self)]
public class GetTest : BaseMockServerTest
{
    [NUnit.Framework.Test]
    public async Task MockServerTest_1()
    {
        const string mockResponse = """
            {
              "object": "hook_endpoint",
              "id": "id",
              "application_id": "application_id",
              "url": "url",
              "description": "description",
              "filter_types": [
                "filter_types",
                "filter_types"
              ],
              "rate_limit_per_second": 1000000,
              "enabled": true,
              "disabled_reason": "manual",
              "disabled_at": "2024-01-15T09:30:00.000Z",
              "failing_since": "2024-01-15T09:30:00.000Z",
              "previous_secret_expires_at": "2024-01-15T09:30:00.000Z",
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
                    .WithPath("/v1/hooks/applications/application/endpoints/endpoint_id")
                    .UsingGet()
            )
            .RespondWith(
                WireMock
                    .ResponseBuilders.Response.Create()
                    .WithStatusCode(200)
                    .WithBody(mockResponse)
            );

        var response = await Client.Hooks.Endpoints.GetAsync(
            new GetEndpointsRequest { Application = "application", EndpointId = "endpoint_id" }
        );
        JsonAssert.AreEqual(response, mockResponse);
    }

    [NUnit.Framework.Test]
    public async Task MockServerTest_2()
    {
        const string mockResponse = """
            {
              "object": "hook_endpoint",
              "id": "hep_01k7c8m4q2f3e9v6t5r1n0p8yz",
              "application_id": "happ_01k7c8m4q2f3e9v6t5r1n0p8yz",
              "url": "https://example.com/webhooks",
              "description": "Production",
              "filter_types": [
                "invoice.paid"
              ],
              "enabled": true,
              "metadata": {
                "key": "value"
              },
              "created_at": "2026-01-15T09:30:00.000Z",
              "updated_at": "2026-01-15T09:30:00.000Z"
            }
            """;

        Server
            .Given(
                WireMock
                    .RequestBuilders.Request.Create()
                    .WithPath(
                        "/v1/hooks/applications/customer_8812/endpoints/hep_01k7c8m4q2f3e9v6t5r1n0p8yz"
                    )
                    .UsingGet()
            )
            .RespondWith(
                WireMock
                    .ResponseBuilders.Response.Create()
                    .WithStatusCode(200)
                    .WithBody(mockResponse)
            );

        var response = await Client.Hooks.Endpoints.GetAsync(
            new GetEndpointsRequest
            {
                Application = "customer_8812",
                EndpointId = "hep_01k7c8m4q2f3e9v6t5r1n0p8yz",
            }
        );
        JsonAssert.AreEqual(response, mockResponse);
    }
}
