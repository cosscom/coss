using Coss.Hooks;
using Coss.Test.Unit.MockServer;
using Coss.Test.Utils;
using NUnit.Framework;

namespace Coss.Test.Unit.MockServer.Hooks.Endpoints;

[TestFixture]
[Parallelizable(ParallelScope.Self)]
public class CreateTest : BaseMockServerTest
{
    [NUnit.Framework.Test]
    public async Task MockServerTest_1()
    {
        const string requestJson = """
            {
              "url": "url"
            }
            """;

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
              "updated_at": "2024-01-15T09:30:00.000Z",
              "secret": "secret"
            }
            """;

        Server
            .Given(
                WireMock
                    .RequestBuilders.Request.Create()
                    .WithPath("/v1/hooks/applications/application/endpoints")
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

        var response = await Client.Hooks.Endpoints.CreateAsync(
            new CreateHookEndpointRequest
            {
                Application = "application",
                Url = "url",
                Description = null,
                FilterTypes = null,
                Secret = null,
                RateLimitPerSecond = null,
                Metadata = null,
                Enabled = null,
            }
        );
        JsonAssert.AreEqual(response, mockResponse);
    }

    [NUnit.Framework.Test]
    public async Task MockServerTest_2()
    {
        const string requestJson = """
            {
              "url": "https://example.com/webhooks",
              "filter_types": [
                "invoice.paid"
              ]
            }
            """;

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
              "updated_at": "2026-01-15T09:30:00.000Z",
              "secret": "whsec_6Jk…"
            }
            """;

        Server
            .Given(
                WireMock
                    .RequestBuilders.Request.Create()
                    .WithPath("/v1/hooks/applications/customer_8812/endpoints")
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

        var response = await Client.Hooks.Endpoints.CreateAsync(
            new CreateHookEndpointRequest
            {
                Application = "customer_8812",
                Url = "https://example.com/webhooks",
                FilterTypes = new List<string>() { "invoice.paid" },
            }
        );
        JsonAssert.AreEqual(response, mockResponse);
    }
}
