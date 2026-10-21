using Coss.Email;
using Coss.Test.Unit.MockServer;
using Coss.Test.Utils;
using NUnit.Framework;
using OneOf;

namespace Coss.Test.Unit.MockServer.Email.Contacts;

[TestFixture]
[Parallelizable(ParallelScope.Self)]
public class ImportTest : BaseMockServerTest
{
    [NUnit.Framework.Test]
    public async Task MockServerTest_1()
    {
        const string requestJson = """
            {
              "contacts": [
                {
                  "email": "email"
                },
                {
                  "email": "email"
                }
              ]
            }
            """;

        const string mockResponse = """
            {
              "object": "contact_import",
              "created": 1000000,
              "updated": 1000000,
              "kept_unsubscribed": 1000000,
              "invalid": [
                {
                  "index": 1000000,
                  "email": "email",
                  "message": "message"
                },
                {
                  "index": 1000000,
                  "email": "email",
                  "message": "message"
                }
              ]
            }
            """;

        Server
            .Given(
                WireMock
                    .RequestBuilders.Request.Create()
                    .WithPath("/v1/contacts/import")
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

        var response = await Client.Email.Contacts.ImportAsync(
            new ImportContactsRequest
            {
                Contacts = new List<ImportContactsRequestContactsItem>()
                {
                    new ImportContactsRequestContactsItem
                    {
                        Email = "email",
                        FirstName = null,
                        LastName = null,
                        Properties = null,
                        Status = null,
                    },
                    new ImportContactsRequestContactsItem
                    {
                        Email = "email",
                        FirstName = null,
                        LastName = null,
                        Properties = null,
                        Status = null,
                    },
                },
                AudienceId = null,
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
                {
                  "email": "ada@example.com",
                  "first_name": "Ada",
                  "properties": {
                    "plan": "pro"
                  }
                },
                {
                  "email": "grace@example.com",
                  "status": "unsubscribed"
                }
              ]
            }
            """;

        const string mockResponse = """
            {
              "object": "contact_import",
              "created": 1,
              "updated": 1,
              "kept_unsubscribed": 0,
              "invalid": [
                {
                  "index": 2,
                  "email": "not-an-address",
                  "message": "Must be an email address."
                }
              ]
            }
            """;

        Server
            .Given(
                WireMock
                    .RequestBuilders.Request.Create()
                    .WithPath("/v1/contacts/import")
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

        var response = await Client.Email.Contacts.ImportAsync(
            new ImportContactsRequest
            {
                Contacts = new List<ImportContactsRequestContactsItem>()
                {
                    new ImportContactsRequestContactsItem
                    {
                        Email = "ada@example.com",
                        FirstName = "Ada",
                        Properties = new Dictionary<string, OneOf<string, double, bool>?>()
                        {
                            { "plan", "pro" },
                        },
                    },
                    new ImportContactsRequestContactsItem
                    {
                        Email = "grace@example.com",
                        Status = "unsubscribed",
                    },
                },
            }
        );
        JsonAssert.AreEqual(response, mockResponse);
    }
}
