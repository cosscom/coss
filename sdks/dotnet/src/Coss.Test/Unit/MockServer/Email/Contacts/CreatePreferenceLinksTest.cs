using Coss.Email;
using Coss.Test.Unit.MockServer;
using Coss.Test.Utils;
using NUnit.Framework;

namespace Coss.Test.Unit.MockServer.Email.Contacts;

[TestFixture]
[Parallelizable(ParallelScope.Self)]
public class CreatePreferenceLinksTest : BaseMockServerTest
{
    [NUnit.Framework.Test]
    public async Task MockServerTest_1()
    {
        const string requestJson = """
            {}
            """;

        const string mockResponse = """
            {
              "object": "preference_links",
              "contact_id": "contact_id",
              "preferences_url": "preferences_url",
              "unsubscribe_url": "unsubscribe_url"
            }
            """;

        Server
            .Given(
                WireMock
                    .RequestBuilders.Request.Create()
                    .WithPath("/v1/contacts/id/preference_links")
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

        var response = await Client.Email.Contacts.CreatePreferenceLinksAsync(
            new CreatePreferenceLinksRequest { Id = "id", Topic = null }
        );
        JsonAssert.AreEqual(response, mockResponse);
    }

    [NUnit.Framework.Test]
    public async Task MockServerTest_2()
    {
        const string requestJson = """
            {
              "topic": "newsletter"
            }
            """;

        const string mockResponse = """
            {
              "object": "preference_links",
              "contact_id": "contact_01k7c8m4q2f3e9v6t5r1n0p8yz",
              "preferences_url": "https://track.cosslinks.com/t/u/aXyZ…",
              "unsubscribe_url": "https://track.cosslinks.com/t/u/aXyZ…/unsubscribe"
            }
            """;

        Server
            .Given(
                WireMock
                    .RequestBuilders.Request.Create()
                    .WithPath("/v1/contacts/contact_01k7c8m4q2f3e9v6t5r1n0p8yz/preference_links")
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

        var response = await Client.Email.Contacts.CreatePreferenceLinksAsync(
            new CreatePreferenceLinksRequest
            {
                Id = "contact_01k7c8m4q2f3e9v6t5r1n0p8yz",
                Topic = "newsletter",
            }
        );
        JsonAssert.AreEqual(response, mockResponse);
    }
}
