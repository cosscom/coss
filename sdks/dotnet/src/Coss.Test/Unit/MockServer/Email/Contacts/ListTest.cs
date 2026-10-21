using Coss.Email;
using Coss.Test.Unit.MockServer;
using Coss.Test.Utils;
using NUnit.Framework;

namespace Coss.Test.Unit.MockServer.Email.Contacts;

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
                },
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
              ],
              "has_more": true
            }
            """;

        Server
            .Given(WireMock.RequestBuilders.Request.Create().WithPath("/v1/contacts").UsingGet())
            .RespondWith(
                WireMock
                    .ResponseBuilders.Response.Create()
                    .WithStatusCode(200)
                    .WithBody(mockResponse)
            );

        var response = await Client.Email.Contacts.ListAsync(new ListContactsRequest());
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
                  "unsubscribed_at": null,
                  "confirmed_at": null,
                  "created_at": "2026-10-10T12:00:00.000Z",
                  "updated_at": "2026-10-10T12:00:00.000Z"
                }
              ],
              "has_more": false
            }
            """;

        Server
            .Given(WireMock.RequestBuilders.Request.Create().WithPath("/v1/contacts").UsingGet())
            .RespondWith(
                WireMock
                    .ResponseBuilders.Response.Create()
                    .WithStatusCode(200)
                    .WithBody(mockResponse)
            );

        var response = await Client.Email.Contacts.ListAsync(new ListContactsRequest());
        JsonAssert.AreEqual(response, mockResponse);
    }
}
