using Coss;
using Coss.Test.Unit.MockServer;
using Coss.Test.Utils;
using NUnit.Framework;

namespace Coss.Test.Unit.MockServer.WebhookListeners;

[TestFixture]
[Parallelizable(ParallelScope.Self)]
public class PollTest : BaseMockServerTest
{
    [NUnit.Framework.Test]
    public async Task MockServerTest_1()
    {
        const string requestJson = """
            {}
            """;

        const string mockResponse = """
            {
              "object": "webhook_listener_poll",
              "listener": {
                "object": "webhook_listener",
                "id": "id",
                "api_version": "api_version",
                "event_types": [
                  "event_types",
                  "event_types"
                ],
                "description": "description",
                "expires_at": "2024-01-15T09:30:00.000Z",
                "created_at": "2024-01-15T09:30:00.000Z"
              },
              "deliveries": [
                {
                  "object": "webhook_listener_delivery",
                  "id": "id",
                  "ack_token": "ack_token",
                  "event_id": "event_id",
                  "event_type": "event_type",
                  "attempt": 1000000,
                  "body": "body",
                  "created_at": "2024-01-15T09:30:00.000Z"
                },
                {
                  "object": "webhook_listener_delivery",
                  "id": "id",
                  "ack_token": "ack_token",
                  "event_id": "event_id",
                  "event_type": "event_type",
                  "attempt": 1000000,
                  "body": "body",
                  "created_at": "2024-01-15T09:30:00.000Z"
                }
              ],
              "acknowledged": 1000000
            }
            """;

        Server
            .Given(
                WireMock
                    .RequestBuilders.Request.Create()
                    .WithPath("/v1/webhook_listeners/id/poll")
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

        var response = await Client.WebhookListeners.PollAsync(
            new PollWebhookListenerRequest
            {
                Id = "id",
                Acks = null,
                WaitMs = null,
                Limit = null,
            }
        );
        JsonAssert.AreEqual(response, mockResponse);
    }

    [NUnit.Framework.Test]
    public async Task MockServerTest_2()
    {
        const string requestJson = """
            {
              "acks": [
                {
                  "delivery_id": "whlisdel_01k7c8n2b5d7f9h1k3m5p7r9tv",
                  "ack_token": "mfz3k2a8",
                  "status_code": 200,
                  "duration_ms": 12,
                  "error": null
                }
              ],
              "wait_ms": 20000
            }
            """;

        const string mockResponse = """
            {
              "object": "webhook_listener_poll",
              "listener": {
                "object": "webhook_listener",
                "id": "whlis_01k7c8m4q2f3e9v6t5r1n0p8yz",
                "api_version": "2026-10-10",
                "event_types": [
                  "email.delivered",
                  "email.bounced"
                ],
                "description": "bailey-mbp → localhost:3000/webhooks",
                "expires_at": "2026-01-15T09:40:00.000Z",
                "created_at": "2026-01-15T09:30:00.000Z"
              },
              "deliveries": [
                {
                  "object": "webhook_listener_delivery",
                  "id": "whlisdel_01k7c8n2b5d7f9h1k3m5p7r9tv",
                  "ack_token": "mfz3k2a8",
                  "event_id": "evt_01k7c8n1z4c6e8g0j2l4n6q8sa",
                  "event_type": "email.delivered",
                  "attempt": 1,
                  "body": "{\"id\":\"evt_01k7c8n1z4c6e8g0j2l4n6q8sa\",\"object\":\"event\",\"type\":\"email.delivered\",\"api_version\":\"2026-10-10\",\"created_at\":\"2026-01-15T09:30:00.000Z\",\"data\":{\"email_id\":\"email_01k7c8m9x3a5c7e9g1j3l5n7q9\",\"recipient\":\"user@example.com\"}}",
                  "created_at": "2026-01-15T09:30:00.000Z"
                }
              ],
              "acknowledged": 0
            }
            """;

        Server
            .Given(
                WireMock
                    .RequestBuilders.Request.Create()
                    .WithPath("/v1/webhook_listeners/whlis_01k7c8m4q2f3e9v6t5r1n0p8yz/poll")
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

        var response = await Client.WebhookListeners.PollAsync(
            new PollWebhookListenerRequest
            {
                Id = "whlis_01k7c8m4q2f3e9v6t5r1n0p8yz",
                Acks = new List<WebhookListenerAck>()
                {
                    new WebhookListenerAck
                    {
                        DeliveryId = "whlisdel_01k7c8n2b5d7f9h1k3m5p7r9tv",
                        AckToken = "mfz3k2a8",
                        StatusCode = 200,
                        DurationMs = 12,
                        Error = null,
                    },
                },
                WaitMs = 20000,
            }
        );
        JsonAssert.AreEqual(response, mockResponse);
    }
}
