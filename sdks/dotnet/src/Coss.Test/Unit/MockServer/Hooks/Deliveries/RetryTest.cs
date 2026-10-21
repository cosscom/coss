using Coss.Test.Unit.MockServer;
using Coss.Test.Utils;
using NUnit.Framework;

namespace Coss.Test.Unit.MockServer.Hooks.Deliveries;

[TestFixture]
[Parallelizable(ParallelScope.Self)]
public class RetryTest : BaseMockServerTest
{
    [NUnit.Framework.Test]
    public async Task MockServerTest_1()
    {
        const string mockResponse = """
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
            """;

        Server
            .Given(
                WireMock
                    .RequestBuilders.Request.Create()
                    .WithPath("/v1/hooks/applications/application/deliveries/delivery_id/retry")
                    .UsingPost()
            )
            .RespondWith(
                WireMock
                    .ResponseBuilders.Response.Create()
                    .WithStatusCode(200)
                    .WithBody(mockResponse)
            );

        var response = await Client.Hooks.Deliveries.RetryAsync(
            new Coss.Hooks.RetryDeliveriesRequest
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
              "object": "hook_delivery",
              "id": "hdel_01k7c8m4q2f3e9v6t5r1n0p8yz",
              "application_id": "happ_01k7c8m4q2f3e9v6t5r1n0p8yz",
              "message_id": "hmsg_01k7c8m4q2f3e9v6t5r1n0p8yz",
              "endpoint_id": "hep_01k7c8m4q2f3e9v6t5r1n0p8yz",
              "status": "succeeded",
              "attempt_count": 1,
              "next_attempt_at": null,
              "last_status_code": 200,
              "last_error": null,
              "created_at": "2026-01-15T09:30:00.000Z",
              "finished_at": "2026-01-15T09:30:00.000Z"
            }
            """;

        Server
            .Given(
                WireMock
                    .RequestBuilders.Request.Create()
                    .WithPath(
                        "/v1/hooks/applications/customer_8812/deliveries/hdel_01k7c8m4q2f3e9v6t5r1n0p8yz/retry"
                    )
                    .UsingPost()
            )
            .RespondWith(
                WireMock
                    .ResponseBuilders.Response.Create()
                    .WithStatusCode(200)
                    .WithBody(mockResponse)
            );

        var response = await Client.Hooks.Deliveries.RetryAsync(
            new Coss.Hooks.RetryDeliveriesRequest
            {
                Application = "customer_8812",
                DeliveryId = "hdel_01k7c8m4q2f3e9v6t5r1n0p8yz",
            }
        );
        JsonAssert.AreEqual(response, mockResponse);
    }
}
