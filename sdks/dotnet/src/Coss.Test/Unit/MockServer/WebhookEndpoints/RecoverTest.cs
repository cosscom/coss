using Coss;
using Coss.Test.Unit.MockServer;
using Coss.Test.Utils;
using global::System.Globalization;
using NUnit.Framework;

namespace Coss.Test.Unit.MockServer.WebhookEndpoints;

[TestFixture]
[Parallelizable(ParallelScope.Self)]
public class RecoverTest : BaseMockServerTest
{
    [NUnit.Framework.Test]
    public async Task MockServerTest_1()
    {
        const string requestJson = """
            {
              "since": "2024-01-15T09:30:00.000Z"
            }
            """;

        const string mockResponse = """
            {
              "object": "webhook_endpoint_recovery",
              "endpoint_id": "endpoint_id",
              "requeued": 1000000,
              "has_more": true
            }
            """;

        Server
            .Given(
                WireMock
                    .RequestBuilders.Request.Create()
                    .WithPath("/v1/webhook_endpoints/id/recover")
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

        var response = await Client.WebhookEndpoints.RecoverAsync(
            new RecoverWebhookEndpointRequest
            {
                Id = "id",
                Since = DateTime.Parse(
                    "2024-01-15T09:30:00.000Z",
                    null,
                    DateTimeStyles.AdjustToUniversal
                ),
            }
        );
        JsonAssert.AreEqual(response, mockResponse);
    }

    [NUnit.Framework.Test]
    public async Task MockServerTest_2()
    {
        const string requestJson = """
            {
              "since": "2026-01-15T09:00:00.000Z"
            }
            """;

        const string mockResponse = """
            {
              "object": "webhook_endpoint_recovery",
              "endpoint_id": "whep_01k7c8m4q2f3e9v6t5r1n0p8yz",
              "requeued": 12,
              "has_more": false
            }
            """;

        Server
            .Given(
                WireMock
                    .RequestBuilders.Request.Create()
                    .WithPath("/v1/webhook_endpoints/whep_01k7c8m4q2f3e9v6t5r1n0p8yz/recover")
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

        var response = await Client.WebhookEndpoints.RecoverAsync(
            new RecoverWebhookEndpointRequest
            {
                Id = "whep_01k7c8m4q2f3e9v6t5r1n0p8yz",
                Since = DateTime.Parse(
                    "2026-01-15T09:00:00.000Z",
                    null,
                    DateTimeStyles.AdjustToUniversal
                ),
            }
        );
        JsonAssert.AreEqual(response, mockResponse);
    }
}
