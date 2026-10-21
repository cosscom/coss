using Coss.Hooks;
using Coss.Test.Unit.MockServer;
using Coss.Test.Utils;
using NUnit.Framework;

namespace Coss.Test.Unit.MockServer.Hooks.Endpoints;

[TestFixture]
[Parallelizable(ParallelScope.Self)]
public class ListDeliveriesTest : BaseMockServerTest
{
    [NUnit.Framework.Test]
    public async Task MockServerTest_1()
    {
        const string mockResponse = """
            {
              "object": "list",
              "data": [
                {
                  "object": "hook_delivery",
                  "id": "id",
                  "application_id": "application_id",
                  "message_id": "message_id",
                  "endpoint_id": "endpoint_id",
                  "status": "pending",
                  "attempt_count": 1000000,
                  "next_attempt_at": "2024-01-15T09:30:00.000Z",
                  "last_status_code": 1000000,
                  "last_error": "last_error",
                  "created_at": "2024-01-15T09:30:00.000Z",
                  "finished_at": "2024-01-15T09:30:00.000Z"
                },
                {
                  "object": "hook_delivery",
                  "id": "id",
                  "application_id": "application_id",
                  "message_id": "message_id",
                  "endpoint_id": "endpoint_id",
                  "status": "pending",
                  "attempt_count": 1000000,
                  "next_attempt_at": "2024-01-15T09:30:00.000Z",
                  "last_status_code": 1000000,
                  "last_error": "last_error",
                  "created_at": "2024-01-15T09:30:00.000Z",
                  "finished_at": "2024-01-15T09:30:00.000Z"
                }
              ],
              "has_more": true
            }
            """;

        Server
            .Given(
                WireMock
                    .RequestBuilders.Request.Create()
                    .WithPath("/v1/hooks/applications/application/endpoints/endpoint_id/deliveries")
                    .UsingGet()
            )
            .RespondWith(
                WireMock
                    .ResponseBuilders.Response.Create()
                    .WithStatusCode(200)
                    .WithBody(mockResponse)
            );

        var response = await Client.Hooks.Endpoints.ListDeliveriesAsync(
            new ListDeliveriesEndpointsRequest
            {
                Application = "application",
                EndpointId = "endpoint_id",
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
                  "object": "hook_delivery",
                  "id": "hdel_01k7c8m4q2f3e9v6t5r1n0p8yz",
                  "application_id": "happ_01k7c8m4q2f3e9v6t5r1n0p8yz",
                  "message_id": "hmsg_01k7c8m4q2f3e9v6t5r1n0p8yz",
                  "endpoint_id": "hep_01k7c8m4q2f3e9v6t5r1n0p8yz",
                  "status": "succeeded",
                  "attempt_count": 1,
                  "last_status_code": 200,
                  "created_at": "2026-01-15T09:30:00.000Z",
                  "finished_at": "2026-01-15T09:30:00.000Z"
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
                        "/v1/hooks/applications/customer_8812/endpoints/hep_01k7c8m4q2f3e9v6t5r1n0p8yz/deliveries"
                    )
                    .UsingGet()
            )
            .RespondWith(
                WireMock
                    .ResponseBuilders.Response.Create()
                    .WithStatusCode(200)
                    .WithBody(mockResponse)
            );

        var response = await Client.Hooks.Endpoints.ListDeliveriesAsync(
            new ListDeliveriesEndpointsRequest
            {
                Application = "customer_8812",
                EndpointId = "hep_01k7c8m4q2f3e9v6t5r1n0p8yz",
            }
        );
        JsonAssert.AreEqual(response, mockResponse);
    }
}
