using Coss;
using Coss.Test.Unit.MockServer;
using Coss.Test.Utils;
using NUnit.Framework;

namespace Coss.Test.Unit.MockServer.WebhookListeners;

[TestFixture]
[Parallelizable(ParallelScope.Self)]
public class CreateTest : BaseMockServerTest
{
    [NUnit.Framework.Test]
    public async Task MockServerTest_1()
    {
        const string requestJson = """
            {
              "description": null
            }
            """;

        const string mockResponse = """
            {
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
            }
            """;

        Server
            .Given(
                WireMock
                    .RequestBuilders.Request.Create()
                    .WithPath("/v1/webhook_listeners")
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

        var response = await Client.WebhookListeners.CreateAsync(
            new CreateWebhookListenerRequest
            {
                EventTypes = null,
                ApiVersion = null,
                Description = null,
            }
        );
        JsonAssert.AreEqual(response, mockResponse);
    }

    [NUnit.Framework.Test]
    public async Task MockServerTest_2()
    {
        const string requestJson = """
            {
              "event_types": [
                "email.sent",
                "email.delivered"
              ],
              "description": "localhost:3000/webhooks"
            }
            """;

        const string mockResponse = """
            {
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
            }
            """;

        Server
            .Given(
                WireMock
                    .RequestBuilders.Request.Create()
                    .WithPath("/v1/webhook_listeners")
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

        var response = await Client.WebhookListeners.CreateAsync(
            new CreateWebhookListenerRequest
            {
                EventTypes = new List<CreateWebhookListenerRequestEventTypesItem>()
                {
                    CreateWebhookListenerRequestEventTypesItem.EmailSent,
                    CreateWebhookListenerRequestEventTypesItem.EmailDelivered,
                },
                Description = "localhost:3000/webhooks",
            }
        );
        JsonAssert.AreEqual(response, mockResponse);
    }
}
