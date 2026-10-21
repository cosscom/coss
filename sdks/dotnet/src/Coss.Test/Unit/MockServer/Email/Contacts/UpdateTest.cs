using Coss.Email;
using Coss.Test.Unit.MockServer;
using Coss.Test.Utils;
using NUnit.Framework;
using OneOf;

namespace Coss.Test.Unit.MockServer.Email.Contacts;

[TestFixture]
[Parallelizable(ParallelScope.Self)]
public class UpdateTest : BaseMockServerTest
{
    [NUnit.Framework.Test]
    public async Task MockServerTest_1()
    {
        const string requestJson = """
            {}
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
                    .WithPath("/v1/contacts/id")
                    .WithHeader("Content-Type", "application/json")
                    .UsingPatch()
                    .WithBodyAsJson(requestJson)
            )
            .RespondWith(
                WireMock
                    .ResponseBuilders.Response.Create()
                    .WithStatusCode(200)
                    .WithBody(mockResponse)
            );

        var response = await Client.Email.Contacts.UpdateAsync(
            new UpdateContactRequest
            {
                Id = "id",
                FirstName = null,
                LastName = null,
                Properties = null,
                Status = null,
                Topics = null,
            }
        );
        JsonAssert.AreEqual(response, mockResponse);
    }

    [NUnit.Framework.Test]
    public async Task MockServerTest_2()
    {
        const string requestJson = """
            {
              "last_name": "Byron",
              "properties": {
                "seats": null
              }
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
                    .WithPath("/v1/contacts/contact_01k7c8m4q2f3e9v6t5r1n0p8yz")
                    .WithHeader("Content-Type", "application/json")
                    .UsingPatch()
                    .WithBodyAsJson(requestJson)
            )
            .RespondWith(
                WireMock
                    .ResponseBuilders.Response.Create()
                    .WithStatusCode(200)
                    .WithBody(mockResponse)
            );

        var response = await Client.Email.Contacts.UpdateAsync(
            new UpdateContactRequest
            {
                Id = "contact_01k7c8m4q2f3e9v6t5r1n0p8yz",
                LastName = "Byron",
                Properties = new Dictionary<string, OneOf<string, double, bool>?>()
                {
                    { "seats", null },
                },
            }
        );
        JsonAssert.AreEqual(response, mockResponse);
    }
}
