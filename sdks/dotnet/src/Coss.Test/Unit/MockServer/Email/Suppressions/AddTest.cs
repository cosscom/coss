using Coss.Email;
using Coss.Test.Unit.MockServer;
using Coss.Test.Utils;
using NUnit.Framework;

namespace Coss.Test.Unit.MockServer.Email.Suppressions;

[TestFixture]
[Parallelizable(ParallelScope.Self)]
public class AddTest : BaseMockServerTest
{
    [NUnit.Framework.Test]
    public async Task MockServerTest_1()
    {
        const string requestJson = """
            {
              "address": "address"
            }
            """;

        const string mockResponse = """
            {
              "object": "suppression",
              "id": "id",
              "address": "address",
              "scope": "scope",
              "reason": "bounce",
              "email_id": "email_id",
              "subaccount_id": "subaccount_id",
              "created_at": "2024-01-15T09:30:00.000Z"
            }
            """;

        Server
            .Given(
                WireMock
                    .RequestBuilders.Request.Create()
                    .WithPath("/v1/suppressions")
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

        var response = await Client.Email.Suppressions.AddAsync(
            new CreateSuppressionRequest
            {
                Address = "address",
                Scope = null,
                Subaccount = null,
            }
        );
        JsonAssert.AreEqual(response, mockResponse);
    }

    [NUnit.Framework.Test]
    public async Task MockServerTest_2()
    {
        const string requestJson = """
            {
              "address": "user@example.com",
              "scope": "marketing"
            }
            """;

        const string mockResponse = """
            {
              "object": "suppression",
              "id": "sup_01k7c8m4q2f3e9v6t5r1n0p8yz",
              "address": "user@example.com",
              "scope": "marketing",
              "reason": "manual",
              "email_id": null,
              "subaccount_id": null,
              "created_at": "2026-01-15T09:30:00.000Z"
            }
            """;

        Server
            .Given(
                WireMock
                    .RequestBuilders.Request.Create()
                    .WithPath("/v1/suppressions")
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

        var response = await Client.Email.Suppressions.AddAsync(
            new CreateSuppressionRequest { Address = "user@example.com", Scope = "marketing" }
        );
        JsonAssert.AreEqual(response, mockResponse);
    }
}
