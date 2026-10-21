using Coss;
using Coss.Test.Unit.MockServer;
using Coss.Test.Utils;
using NUnit.Framework;

namespace Coss.Test.Unit.MockServer.WebhookEndpoints;

[TestFixture]
[Parallelizable(ParallelScope.Self)]
public class RollSecretTest : BaseMockServerTest
{
    [NUnit.Framework.Test]
    public async Task MockServerTest_1()
    {
        const string requestJson = """
            {}
            """;

        const string mockResponse = """
            {
              "object": "webhook_endpoint",
              "id": "id",
              "url": "url",
              "description": "description",
              "event_types": [
                "event_types",
                "event_types"
              ],
              "api_version": "api_version",
              "enabled": true,
              "disabled_reason": "manual",
              "disabled_at": "2024-01-15T09:30:00.000Z",
              "failing_since": "2024-01-15T09:30:00.000Z",
              "previous_secret_expires_at": "2024-01-15T09:30:00.000Z",
              "created_at": "2024-01-15T09:30:00.000Z",
              "updated_at": "2024-01-15T09:30:00.000Z",
              "secret": "secret"
            }
            """;

        Server
            .Given(
                WireMock
                    .RequestBuilders.Request.Create()
                    .WithPath("/v1/webhook_endpoints/id/roll_secret")
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

        var response = await Client.WebhookEndpoints.RollSecretAsync(
            new RollWebhookEndpointSecretRequest { Id = "id", PreviousSecretExpiresIn = null }
        );
        JsonAssert.AreEqual(response, mockResponse);
    }

    [NUnit.Framework.Test]
    public async Task MockServerTest_2()
    {
        const string requestJson = """
            {
              "previous_secret_expires_in": 3600
            }
            """;

        const string mockResponse = """
            {
              "object": "webhook_endpoint",
              "id": "whep_01k7c8m4q2f3e9v6t5r1n0p8yz",
              "url": "https://example.com/webhooks/coss",
              "description": "Production receiver",
              "event_types": [
                "email.delivered",
                "email.bounced"
              ],
              "api_version": "2026-10-10",
              "enabled": true,
              "disabled_reason": null,
              "disabled_at": null,
              "failing_since": null,
              "previous_secret_expires_at": null,
              "created_at": "2026-01-15T09:30:00.000Z",
              "updated_at": "2026-01-15T09:30:00.000Z",
              "secret": "whsec_6Jk…"
            }
            """;

        Server
            .Given(
                WireMock
                    .RequestBuilders.Request.Create()
                    .WithPath("/v1/webhook_endpoints/whep_01k7c8m4q2f3e9v6t5r1n0p8yz/roll_secret")
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

        var response = await Client.WebhookEndpoints.RollSecretAsync(
            new RollWebhookEndpointSecretRequest
            {
                Id = "whep_01k7c8m4q2f3e9v6t5r1n0p8yz",
                PreviousSecretExpiresIn = 3600,
            }
        );
        JsonAssert.AreEqual(response, mockResponse);
    }
}
