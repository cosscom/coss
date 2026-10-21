using Coss.Email;
using Coss.Test.Unit.MockServer;
using Coss.Test.Utils;
using NUnit.Framework;

namespace Coss.Test.Unit.MockServer.Email.Suppressions;

[TestFixture]
[Parallelizable(ParallelScope.Self)]
public class ImportTest : BaseMockServerTest
{
    [NUnit.Framework.Test]
    public async Task MockServerTest_1()
    {
        const string requestJson = """
            {
              "suppressions": [
                {
                  "address": "address"
                },
                {
                  "address": "address"
                }
              ]
            }
            """;

        const string mockResponse = """
            {
              "object": "suppression_import",
              "created": 1000000,
              "existing": 1000000,
              "invalid": [
                {
                  "index": 1000000,
                  "address": "address",
                  "message": "message"
                },
                {
                  "index": 1000000,
                  "address": "address",
                  "message": "message"
                }
              ]
            }
            """;

        Server
            .Given(
                WireMock
                    .RequestBuilders.Request.Create()
                    .WithPath("/v1/suppressions/import")
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

        var response = await Client.Email.Suppressions.ImportAsync(
            new ImportSuppressionsRequest
            {
                Suppressions = new List<ImportSuppressionsRequestSuppressionsItem>()
                {
                    new ImportSuppressionsRequestSuppressionsItem
                    {
                        Address = "address",
                        Scope = null,
                    },
                    new ImportSuppressionsRequestSuppressionsItem
                    {
                        Address = "address",
                        Scope = null,
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
              "suppressions": [
                {
                  "address": "user@example.com"
                },
                {
                  "address": "other@example.com",
                  "scope": "marketing"
                }
              ]
            }
            """;

        const string mockResponse = """
            {
              "object": "suppression_import",
              "created": 2,
              "existing": 0,
              "invalid": [
                {
                  "index": 1000000,
                  "address": "address",
                  "message": "message"
                }
              ]
            }
            """;

        Server
            .Given(
                WireMock
                    .RequestBuilders.Request.Create()
                    .WithPath("/v1/suppressions/import")
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

        var response = await Client.Email.Suppressions.ImportAsync(
            new ImportSuppressionsRequest
            {
                Suppressions = new List<ImportSuppressionsRequestSuppressionsItem>()
                {
                    new ImportSuppressionsRequestSuppressionsItem { Address = "user@example.com" },
                    new ImportSuppressionsRequestSuppressionsItem
                    {
                        Address = "other@example.com",
                        Scope = "marketing",
                    },
                },
            }
        );
        JsonAssert.AreEqual(response, mockResponse);
    }
}
