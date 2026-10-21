using Coss.Email;
using Coss.Test.Unit.MockServer;
using Coss.Test.Utils;
using NUnit.Framework;

namespace Coss.Test.Unit.MockServer.Email.Audiences;

[TestFixture]
[Parallelizable(ParallelScope.Self)]
public class AddContactsTest : BaseMockServerTest
{
    [NUnit.Framework.Test]
    public async Task MockServerTest_1()
    {
        const string requestJson = """
            {
              "contacts": [
                "contacts",
                "contacts"
              ]
            }
            """;

        const string mockResponse = """
            {
              "object": "audience_contacts",
              "added": 1000000,
              "existing": 1000000,
              "missing": [
                "missing",
                "missing"
              ]
            }
            """;

        Server
            .Given(
                WireMock
                    .RequestBuilders.Request.Create()
                    .WithPath("/v1/audiences/id/contacts")
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

        var response = await Client.Email.Audiences.AddContactsAsync(
            new AddAudienceContactsRequest
            {
                Id = "id",
                Contacts = new List<string>() { "contacts", "contacts" },
            }
        );
        JsonAssert.AreEqual(response, mockResponse);
    }

    [NUnit.Framework.Test]
    public async Task MockServerTest_2()
    {
        const string requestJson = """
            {
              "contacts": [
                "contact_01k7c8m4q2f3e9v6t5r1n0p8yz",
                "grace@example.com"
              ]
            }
            """;

        const string mockResponse = """
            {
              "object": "audience_contacts",
              "added": 1,
              "existing": 0,
              "missing": [
                "missing"
              ]
            }
            """;

        Server
            .Given(
                WireMock
                    .RequestBuilders.Request.Create()
                    .WithPath("/v1/audiences/aud_01k7c8m4q2f3e9v6t5r1n0p8yz/contacts")
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

        var response = await Client.Email.Audiences.AddContactsAsync(
            new AddAudienceContactsRequest
            {
                Id = "aud_01k7c8m4q2f3e9v6t5r1n0p8yz",
                Contacts = new List<string>()
                {
                    "contact_01k7c8m4q2f3e9v6t5r1n0p8yz",
                    "grace@example.com",
                },
            }
        );
        JsonAssert.AreEqual(response, mockResponse);
    }
}
