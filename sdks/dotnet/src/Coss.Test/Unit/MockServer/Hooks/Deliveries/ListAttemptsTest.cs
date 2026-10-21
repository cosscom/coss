using Coss.Hooks;
using Coss.Test.Unit.MockServer;
using Coss.Test.Utils;
using NUnit.Framework;

namespace Coss.Test.Unit.MockServer.Hooks.Deliveries;

[TestFixture]
[Parallelizable(ParallelScope.Self)]
public class ListAttemptsTest : BaseMockServerTest
{
    [NUnit.Framework.Test]
    public async Task MockServerTest_1()
    {
        const string mockResponse = """
            {
              "object": "list",
              "data": [
                {
                  "object": "hook_attempt",
                  "id": "id",
                  "delivery_id": "delivery_id",
                  "endpoint_id": "endpoint_id",
                  "attempted_at": "2024-01-15T09:30:00.000Z",
                  "status_code": 1000000,
                  "duration_ms": 1000000,
                  "error": "error",
                  "response_excerpt": "response_excerpt"
                },
                {
                  "object": "hook_attempt",
                  "id": "id",
                  "delivery_id": "delivery_id",
                  "endpoint_id": "endpoint_id",
                  "attempted_at": "2024-01-15T09:30:00.000Z",
                  "status_code": 1000000,
                  "duration_ms": 1000000,
                  "error": "error",
                  "response_excerpt": "response_excerpt"
                }
              ],
              "has_more": true
            }
            """;

        Server
            .Given(
                WireMock
                    .RequestBuilders.Request.Create()
                    .WithPath("/v1/hooks/applications/application/deliveries/delivery_id/attempts")
                    .UsingGet()
            )
            .RespondWith(
                WireMock
                    .ResponseBuilders.Response.Create()
                    .WithStatusCode(200)
                    .WithBody(mockResponse)
            );

        var response = await Client.Hooks.Deliveries.ListAttemptsAsync(
            new ListAttemptsDeliveriesRequest
            {
                Application = "application",
                DeliveryId = "delivery_id",
            }
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
                  "object": "hook_attempt",
                  "id": "hatt_01k7c8m4q2f3e9v6t5r1n0p8yz",
                  "delivery_id": "hdel_01k7c8m4q2f3e9v6t5r1n0p8yz",
                  "endpoint_id": "hep_01k7c8m4q2f3e9v6t5r1n0p8yz",
                  "attempted_at": "2026-01-15T09:30:00.000Z",
                  "status_code": 200,
                  "duration_ms": 182,
                  "response_excerpt": "ok"
                }
              ],
              "has_more": false
            }
            """;

        Server
            .Given(
                WireMock
                    .RequestBuilders.Request.Create()
                    .WithPath(
                        "/v1/hooks/applications/customer_8812/deliveries/hdel_01k7c8m4q2f3e9v6t5r1n0p8yz/attempts"
                    )
                    .UsingGet()
            )
            .RespondWith(
                WireMock
                    .ResponseBuilders.Response.Create()
                    .WithStatusCode(200)
                    .WithBody(mockResponse)
            );

        var response = await Client.Hooks.Deliveries.ListAttemptsAsync(
            new ListAttemptsDeliveriesRequest
            {
                Application = "customer_8812",
                DeliveryId = "hdel_01k7c8m4q2f3e9v6t5r1n0p8yz",
            }
        );
        JsonAssert.AreEqual(response, mockResponse);
    }
}
