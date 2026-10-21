using Coss.Hooks;
using Coss.Test.Unit.MockServer;
using Coss.Test.Utils;
using NUnit.Framework;

namespace Coss.Test.Unit.MockServer.Hooks.Endpoints;

[TestFixture]
[Parallelizable(ParallelScope.Self)]
public class SendTestTest : BaseMockServerTest
{
    [NUnit.Framework.Test]
    public async Task MockServerTest_1()
    {
        const string requestJson = """
            {
              "event_type": "event_type"
            }
            """;

        const string mockResponse = """
            {
              "object": "hook_message",
              "id": "id",
              "application_id": "application_id",
              "event_type": "event_type",
              "payload": {
                "payload": {
                  "key": "value"
                }
              },
              "created_at": "2024-01-15T09:30:00.000Z"
            }
            """;

        Server
            .Given(
                WireMock
                    .RequestBuilders.Request.Create()
                    .WithPath("/v1/hooks/applications/application/endpoints/endpoint_id/test")
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

        var response = await Client.Hooks.Endpoints.SendTestAsync(
            new SendHookTestRequest
            {
                Application = "application",
                EndpointId = "endpoint_id",
                EventType = "event_type",
                Payload = null,
            }
        );
        JsonAssert.AreEqual(response, mockResponse);
    }

    [NUnit.Framework.Test]
    public async Task MockServerTest_2()
    {
        const string requestJson = """
            {
              "event_type": "invoice.paid"
            }
            """;

        const string mockResponse = """
            {
              "object": "hook_message",
              "id": "hmsg_01k7c8m4q2f3e9v6t5r1n0p8yz",
              "application_id": "happ_01k7c8m4q2f3e9v6t5r1n0p8yz",
              "event_type": "invoice.paid",
              "payload": {
                "invoice_id": "in_1042",
                "amount": 4200,
                "currency": "usd"
              },
              "created_at": "2026-01-15T09:30:00.000Z"
            }
            """;

        Server
            .Given(
                WireMock
                    .RequestBuilders.Request.Create()
                    .WithPath(
                        "/v1/hooks/applications/customer_8812/endpoints/hep_01k7c8m4q2f3e9v6t5r1n0p8yz/test"
                    )
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

        var response = await Client.Hooks.Endpoints.SendTestAsync(
            new SendHookTestRequest
            {
                Application = "customer_8812",
                EndpointId = "hep_01k7c8m4q2f3e9v6t5r1n0p8yz",
                EventType = "invoice.paid",
            }
        );
        JsonAssert.AreEqual(response, mockResponse);
    }
}
