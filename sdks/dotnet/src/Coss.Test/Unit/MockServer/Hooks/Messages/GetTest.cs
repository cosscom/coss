using Coss.Test.Unit.MockServer;
using Coss.Test.Utils;
using NUnit.Framework;

namespace Coss.Test.Unit.MockServer.Hooks.Messages;

[TestFixture]
[Parallelizable(ParallelScope.Self)]
public class GetTest : BaseMockServerTest
{
    [NUnit.Framework.Test]
    public async Task MockServerTest_1()
    {
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
                    .WithPath("/v1/hooks/applications/application/messages/message_id")
                    .UsingGet()
            )
            .RespondWith(
                WireMock
                    .ResponseBuilders.Response.Create()
                    .WithStatusCode(200)
                    .WithBody(mockResponse)
            );

        var response = await Client.Hooks.Messages.GetAsync(
            new Coss.Hooks.GetMessagesRequest
            {
                Application = "application",
                MessageId = "message_id",
            }
        );
        JsonAssert.AreEqual(response, mockResponse);
    }

    [NUnit.Framework.Test]
    public async Task MockServerTest_2()
    {
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
                        "/v1/hooks/applications/customer_8812/messages/hmsg_01k7c8m4q2f3e9v6t5r1n0p8yz"
                    )
                    .UsingGet()
            )
            .RespondWith(
                WireMock
                    .ResponseBuilders.Response.Create()
                    .WithStatusCode(200)
                    .WithBody(mockResponse)
            );

        var response = await Client.Hooks.Messages.GetAsync(
            new Coss.Hooks.GetMessagesRequest
            {
                Application = "customer_8812",
                MessageId = "hmsg_01k7c8m4q2f3e9v6t5r1n0p8yz",
            }
        );
        JsonAssert.AreEqual(response, mockResponse);
    }
}
