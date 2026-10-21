using Coss.Test.Unit.MockServer;
using Coss.Test.Utils;
using NUnit.Framework;

namespace Coss.Test.Unit.MockServer.WebhookEndpoints.Deliveries;

[TestFixture]
[Parallelizable(ParallelScope.Self)]
public class GetTest : BaseMockServerTest
{
    [NUnit.Framework.Test]
    public async Task MockServerTest_1()
    {
        const string mockResponse = """
            {
              "object": "webhook_delivery",
              "id": "id",
              "endpoint_id": "endpoint_id",
              "event_id": "event_id",
              "event_type": "event_type",
              "status": "pending",
              "attempt_count": 1000000,
              "next_attempt_at": "2024-01-15T09:30:00.000Z",
              "last_status_code": 1000000,
              "last_error": "last_error",
              "payload": {
                "payload": {
                  "key": "value"
                }
              },
              "attempts": [
                {
                  "object": "webhook_attempt",
                  "id": "id",
                  "attempted_at": "2024-01-15T09:30:00.000Z",
                  "status_code": 1000000,
                  "duration_ms": 1000000,
                  "error": "error",
                  "response_excerpt": "response_excerpt"
                },
                {
                  "object": "webhook_attempt",
                  "id": "id",
                  "attempted_at": "2024-01-15T09:30:00.000Z",
                  "status_code": 1000000,
                  "duration_ms": 1000000,
                  "error": "error",
                  "response_excerpt": "response_excerpt"
                }
              ],
              "created_at": "2024-01-15T09:30:00.000Z",
              "updated_at": "2024-01-15T09:30:00.000Z"
            }
            """;

        Server
            .Given(
                WireMock
                    .RequestBuilders.Request.Create()
                    .WithPath("/v1/webhook_endpoints/id/deliveries/delivery_id")
                    .UsingGet()
            )
            .RespondWith(
                WireMock
                    .ResponseBuilders.Response.Create()
                    .WithStatusCode(200)
                    .WithBody(mockResponse)
            );

        var response = await Client.WebhookEndpoints.Deliveries.GetAsync(
            new Coss.WebhookEndpoints.GetDeliveriesRequest { Id = "id", DeliveryId = "delivery_id" }
        );
        JsonAssert.AreEqual(response, mockResponse);
    }

    [NUnit.Framework.Test]
    public async Task MockServerTest_2()
    {
        const string mockResponse = """
            {
              "object": "webhook_delivery",
              "id": "whdel_01k7c8n2b5d7f9h1k3m5p7r9tv",
              "endpoint_id": "whep_01k7c8m4q2f3e9v6t5r1n0p8yz",
              "event_id": "evt_01k7c8n1z4c6e8g0j2l4n6q8sa",
              "event_type": "email.delivered",
              "status": "succeeded",
              "attempt_count": 1,
              "next_attempt_at": null,
              "last_status_code": 200,
              "last_error": null,
              "payload": {
                "id": "evt_01k7c8n1z4c6e8g0j2l4n6q8sa",
                "object": "event",
                "type": "email.delivered",
                "created_at": "2026-01-15T09:30:00.000Z",
                "data": {
                  "email_id": "email_01k7c8m9x3a5c7e9g1j3l5n7q9",
                  "recipient": "user@example.com"
                }
              },
              "attempts": [
                {
                  "object": "webhook_attempt",
                  "id": "whatt_01k7c8n2c9e1g3j5l7n9q1s3uw",
                  "attempted_at": "2026-01-15T09:30:01.000Z",
                  "status_code": 200,
                  "duration_ms": 182,
                  "error": null,
                  "response_excerpt": "ok"
                }
              ],
              "created_at": "2026-01-15T09:30:00.000Z",
              "updated_at": "2026-01-15T09:30:01.000Z"
            }
            """;

        Server
            .Given(
                WireMock
                    .RequestBuilders.Request.Create()
                    .WithPath(
                        "/v1/webhook_endpoints/whep_01k7c8m4q2f3e9v6t5r1n0p8yz/deliveries/whdel_01k7c8n2b5d7f9h1k3m5p7r9tv"
                    )
                    .UsingGet()
            )
            .RespondWith(
                WireMock
                    .ResponseBuilders.Response.Create()
                    .WithStatusCode(200)
                    .WithBody(mockResponse)
            );

        var response = await Client.WebhookEndpoints.Deliveries.GetAsync(
            new Coss.WebhookEndpoints.GetDeliveriesRequest
            {
                Id = "whep_01k7c8m4q2f3e9v6t5r1n0p8yz",
                DeliveryId = "whdel_01k7c8n2b5d7f9h1k3m5p7r9tv",
            }
        );
        JsonAssert.AreEqual(response, mockResponse);
    }
}
