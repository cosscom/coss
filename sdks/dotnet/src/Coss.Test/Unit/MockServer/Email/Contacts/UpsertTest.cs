using Coss.Email;
using Coss.Test.Unit.MockServer;
using Coss.Test.Utils;
using NUnit.Framework;
using OneOf;

namespace Coss.Test.Unit.MockServer.Email.Contacts;

[TestFixture]
[Parallelizable(ParallelScope.Self)]
public class UpsertTest : BaseMockServerTest
{
    [NUnit.Framework.Test]
    public async Task MockServerTest_1()
    {
        const string requestJson = """
            {
              "email": "email"
            }
            """;

        const string mockResponse = """
            {
              "object": "contact",
              "id": "id",
              "email": "email",
              "first_name": "first_name",
              "last_name": "last_name",
              "status": "subscribed",
              "properties": {
                "properties": "properties"
              },
              "source": "api",
              "subscribed_at": "2024-01-15T09:30:00.000Z",
              "unsubscribed_at": "2024-01-15T09:30:00.000Z",
              "confirmed_at": "2024-01-15T09:30:00.000Z",
              "created_at": "2024-01-15T09:30:00.000Z",
              "updated_at": "2024-01-15T09:30:00.000Z"
            }
            """;

        Server
            .Given(
                WireMock
                    .RequestBuilders.Request.Create()
                    .WithPath("/v1/contacts")
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

        var response = await Client.Email.Contacts.UpsertAsync(
            new UpsertContactRequest
            {
                Email = "email",
                FirstName = null,
                LastName = null,
                Properties = null,
                Status = null,
                AudienceIds = null,
                Topics = null,
                DoubleOptIn = null,
            }
        );
        JsonAssert.AreEqual(response, mockResponse);
    }

    [NUnit.Framework.Test]
    public async Task MockServerTest_2()
    {
        const string requestJson = """
            {
              "email": "ada@example.com",
              "first_name": "Ada",
              "properties": {
                "plan": "pro"
              },
              "topics": [
                {
                  "topic": "newsletter",
                  "status": "opted_in"
                }
              ]
            }
            """;

        const string mockResponse = """
            {
              "object": "contact",
              "id": "contact_01k7c8m4q2f3e9v6t5r1n0p8yz",
              "email": "ada@example.com",
              "first_name": "Ada",
              "last_name": "Lovelace",
              "status": "subscribed",
              "properties": {
                "plan": "pro",
                "seats": 5
              },
              "source": "api",
              "subscribed_at": "2026-10-10T12:00:00.000Z",
              "created_at": "2026-10-10T12:00:00.000Z",
              "updated_at": "2026-10-10T12:00:00.000Z"
            }
            """;

        Server
            .Given(
                WireMock
                    .RequestBuilders.Request.Create()
                    .WithPath("/v1/contacts")
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

        var response = await Client.Email.Contacts.UpsertAsync(
            new UpsertContactRequest
            {
                Email = "ada@example.com",
                FirstName = "Ada",
                Properties = new Dictionary<string, OneOf<string, double, bool>?>()
                {
                    { "plan", "pro" },
                },
                Topics = new List<UpsertContactRequestTopicsItem>()
                {
                    new UpsertContactRequestTopicsItem
                    {
                        Topic = "newsletter",
                        Status = UpsertContactRequestTopicsItemStatus.OptedIn,
                    },
                },
            }
        );
        JsonAssert.AreEqual(response, mockResponse);
    }
}
