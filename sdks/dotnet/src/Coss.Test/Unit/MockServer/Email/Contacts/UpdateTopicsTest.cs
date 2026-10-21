using Coss.Email;
using Coss.Test.Unit.MockServer;
using Coss.Test.Utils;
using NUnit.Framework;

namespace Coss.Test.Unit.MockServer.Email.Contacts;

[TestFixture]
[Parallelizable(ParallelScope.Self)]
public class UpdateTopicsTest : BaseMockServerTest
{
    [NUnit.Framework.Test]
    public async Task MockServerTest_1()
    {
        const string requestJson = """
            {
              "topics": [
                {
                  "topic": "topic",
                  "status": "opted_in"
                },
                {
                  "topic": "topic",
                  "status": "opted_in"
                }
              ]
            }
            """;

        const string mockResponse = """
            {
              "object": "contact_topics",
              "contact_id": "contact_id",
              "topics": [
                {
                  "topic": "topic",
                  "name": "name",
                  "subscribed": true,
                  "choice": "opted_in"
                },
                {
                  "topic": "topic",
                  "name": "name",
                  "subscribed": true,
                  "choice": "opted_in"
                }
              ]
            }
            """;

        Server
            .Given(
                WireMock
                    .RequestBuilders.Request.Create()
                    .WithPath("/v1/contacts/id/topics")
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

        var response = await Client.Email.Contacts.UpdateTopicsAsync(
            new UpdateContactTopicsRequest
            {
                Id = "id",
                Topics = new List<UpdateContactTopicsRequestTopicsItem>()
                {
                    new UpdateContactTopicsRequestTopicsItem
                    {
                        Topic = "topic",
                        Status = UpdateContactTopicsRequestTopicsItemStatus.OptedIn,
                    },
                    new UpdateContactTopicsRequestTopicsItem
                    {
                        Topic = "topic",
                        Status = UpdateContactTopicsRequestTopicsItemStatus.OptedIn,
                    },
                },
            }
        );
        JsonAssert.AreEqual(response, mockResponse);
    }

    [NUnit.Framework.Test]
    public async Task MockServerTest_2()
    {
        const string requestJson = """
            {
              "topics": [
                {
                  "topic": "product",
                  "status": "opted_out"
                }
              ]
            }
            """;

        const string mockResponse = """
            {
              "object": "contact_topics",
              "contact_id": "contact_01k7c8m4q2f3e9v6t5r1n0p8yz",
              "topics": [
                {
                  "topic": "newsletter",
                  "name": "Newsletter",
                  "subscribed": true,
                  "choice": null
                },
                {
                  "topic": "product",
                  "name": "Product updates",
                  "subscribed": false,
                  "choice": "opted_out"
                }
              ]
            }
            """;

        Server
            .Given(
                WireMock
                    .RequestBuilders.Request.Create()
                    .WithPath("/v1/contacts/contact_01k7c8m4q2f3e9v6t5r1n0p8yz/topics")
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

        var response = await Client.Email.Contacts.UpdateTopicsAsync(
            new UpdateContactTopicsRequest
            {
                Id = "contact_01k7c8m4q2f3e9v6t5r1n0p8yz",
                Topics = new List<UpdateContactTopicsRequestTopicsItem>()
                {
                    new UpdateContactTopicsRequestTopicsItem
                    {
                        Topic = "product",
                        Status = UpdateContactTopicsRequestTopicsItemStatus.OptedOut,
                    },
                },
            }
        );
        JsonAssert.AreEqual(response, mockResponse);
    }
}
