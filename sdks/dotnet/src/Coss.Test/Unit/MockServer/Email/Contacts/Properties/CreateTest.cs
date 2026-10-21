using Coss.Email.Contacts;
using Coss.Test.Unit.MockServer;
using Coss.Test.Utils;
using NUnit.Framework;

namespace Coss.Test.Unit.MockServer.Email.Contacts.Properties;

[TestFixture]
[Parallelizable(ParallelScope.Self)]
public class CreateTest : BaseMockServerTest
{
    [NUnit.Framework.Test]
    public async Task MockServerTest_1()
    {
        const string requestJson = """
            {
              "key": "key",
              "type": "string"
            }
            """;

        const string mockResponse = """
            {
              "object": "contact_property",
              "id": "id",
              "key": "key",
              "type": "string",
              "fallback": "fallback",
              "created_at": "2024-01-15T09:30:00.000Z",
              "updated_at": "2024-01-15T09:30:00.000Z"
            }
            """;

        Server
            .Given(
                WireMock
                    .RequestBuilders.Request.Create()
                    .WithPath("/v1/contact_properties")
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

        var response = await Client.Email.Contacts.Properties.CreateAsync(
            new CreateContactPropertyRequest
            {
                Key = "key",
                Type = CreateContactPropertyRequestType.String,
                Fallback = null,
            }
        );
        JsonAssert.AreEqual(response, mockResponse);
    }

    [NUnit.Framework.Test]
    public async Task MockServerTest_2()
    {
        const string requestJson = """
            {
              "key": "plan",
              "type": "string",
              "fallback": "free"
            }
            """;

        const string mockResponse = """
            {
              "object": "contact_property",
              "id": "cprop_01k7c8m4q2f3e9v6t5r1n0p8yz",
              "key": "plan",
              "type": "string",
              "fallback": "free",
              "created_at": "2026-10-10T12:00:00.000Z",
              "updated_at": "2026-10-10T12:00:00.000Z"
            }
            """;

        Server
            .Given(
                WireMock
                    .RequestBuilders.Request.Create()
                    .WithPath("/v1/contact_properties")
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

        var response = await Client.Email.Contacts.Properties.CreateAsync(
            new CreateContactPropertyRequest
            {
                Key = "plan",
                Type = CreateContactPropertyRequestType.String,
                Fallback = "free",
            }
        );
        JsonAssert.AreEqual(response, mockResponse);
    }
}
