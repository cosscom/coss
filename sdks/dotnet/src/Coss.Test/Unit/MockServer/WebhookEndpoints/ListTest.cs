using Coss.Test.Unit.MockServer;
using Coss.Test.Utils;
using NUnit.Framework;

namespace Coss.Test.Unit.MockServer.WebhookEndpoints;

[TestFixture]
[Parallelizable(ParallelScope.Self)]
public class ListTest : BaseMockServerTest
{
    [NUnit.Framework.Test]
    public async Task MockServerTest_1()
    {
        const string mockResponse = """
            {
              "object": "list",
              "data": [
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
                  "updated_at": "2024-01-15T09:30:00.000Z"
                },
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
                  "updated_at": "2024-01-15T09:30:00.000Z"
                }
              ],
              "has_more": true
            }
            """;

        Server
            .Given(
                WireMock
                    .RequestBuilders.Request.Create()
                    .WithPath("/v1/webhook_endpoints")
                    .UsingGet()
            )
            .RespondWith(
                WireMock
                    .ResponseBuilders.Response.Create()
                    .WithStatusCode(200)
                    .WithBody(mockResponse)
            );

        var response = await Client.WebhookEndpoints.ListAsync();
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
                  "created_at": "2026-01-15T09:30:00.000Z",
                  "updated_at": "2026-01-15T09:30:00.000Z"
                }
              ],
              "has_more": false
            }
            """;

        Server
            .Given(
                WireMock
                    .RequestBuilders.Request.Create()
                    .WithPath("/v1/webhook_endpoints")
                    .UsingGet()
            )
            .RespondWith(
                WireMock
                    .ResponseBuilders.Response.Create()
                    .WithStatusCode(200)
                    .WithBody(mockResponse)
            );

        var response = await Client.WebhookEndpoints.ListAsync();
        JsonAssert.AreEqual(response, mockResponse);
    }
}
