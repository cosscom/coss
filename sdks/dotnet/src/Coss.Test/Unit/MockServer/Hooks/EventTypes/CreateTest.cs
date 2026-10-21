using Coss.Hooks;
using Coss.Test.Unit.MockServer;
using Coss.Test.Utils;
using NUnit.Framework;

namespace Coss.Test.Unit.MockServer.Hooks.EventTypes;

[TestFixture]
[Parallelizable(ParallelScope.Self)]
public class CreateTest : BaseMockServerTest
{
    [NUnit.Framework.Test]
    public async Task MockServerTest_1()
    {
        const string requestJson = """
            {
              "name": "name"
            }
            """;

        const string mockResponse = """
            {
              "object": "hook_event_type",
              "name": "name",
              "description": "description",
              "schema": {
                "schema": {
                  "key": "value"
                }
              },
              "examples": [
                {
                  "examples": {
                    "key": "value"
                  }
                },
                {
                  "examples": {
                    "key": "value"
                  }
                }
              ],
              "archived": true,
              "created_at": "2024-01-15T09:30:00.000Z",
              "updated_at": "2024-01-15T09:30:00.000Z"
            }
            """;

        Server
            .Given(
                WireMock
                    .RequestBuilders.Request.Create()
                    .WithPath("/v1/hooks/event_types")
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

        var response = await Client.Hooks.EventTypes.CreateAsync(
            new CreateHookEventTypeRequest
            {
                Name = "name",
                Description = null,
                Schema = null,
                Examples = null,
            }
        );
        JsonAssert.AreEqual(response, mockResponse);
    }

    [NUnit.Framework.Test]
    public async Task MockServerTest_2()
    {
        const string requestJson = """
            {
              "name": "invoice.paid",
              "description": "An invoice was paid in full.",
              "examples": [
                {
                  "invoice_id": "in_1042",
                  "amount": 4200,
                  "currency": "usd"
                }
              ]
            }
            """;

        const string mockResponse = """
            {
              "object": "hook_event_type",
              "name": "invoice.paid",
              "description": "An invoice was paid in full.",
              "schema": {
                "type": "object",
                "properties": {
                  "invoice_id": {
                    "type": "string"
                  },
                  "amount": {
                    "type": "integer"
                  }
                }
              },
              "examples": [
                {
                  "invoice_id": "in_1042",
                  "amount": 4200,
                  "currency": "usd"
                }
              ],
              "archived": false,
              "created_at": "2026-01-15T09:30:00.000Z",
              "updated_at": "2026-01-15T09:30:00.000Z"
            }
            """;

        Server
            .Given(
                WireMock
                    .RequestBuilders.Request.Create()
                    .WithPath("/v1/hooks/event_types")
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

        var response = await Client.Hooks.EventTypes.CreateAsync(
            new CreateHookEventTypeRequest
            {
                Name = "invoice.paid",
                Description = "An invoice was paid in full.",
                Examples = new List<Dictionary<string, object?>>()
                {
                    new Dictionary<string, object?>()
                    {
                        { "invoice_id", "in_1042" },
                        { "amount", 4200 },
                        { "currency", "usd" },
                    },
                },
            }
        );
        JsonAssert.AreEqual(response, mockResponse);
    }
}
