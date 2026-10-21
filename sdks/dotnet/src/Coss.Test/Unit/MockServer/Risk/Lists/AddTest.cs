using Coss;
using Coss.Risk;
using Coss.Test.Unit.MockServer;
using Coss.Test.Utils;
using NUnit.Framework;

namespace Coss.Test.Unit.MockServer.Risk.Lists;

[TestFixture]
[Parallelizable(ParallelScope.Self)]
public class AddTest : BaseMockServerTest
{
    [NUnit.Framework.Test]
    public async Task MockServerTest_1()
    {
        const string requestJson = """
            {
              "list": "allow",
              "type": "email",
              "value": "x"
            }
            """;

        const string mockResponse = """
            {
              "object": "risk_list_entry",
              "id": "id",
              "list": "allow",
              "type": "email",
              "value": "value",
              "note": "note",
              "expires_at": "2024-01-15T09:30:00.000Z",
              "created_at": "2024-01-15T09:30:00.000Z"
            }
            """;

        Server
            .Given(
                WireMock
                    .RequestBuilders.Request.Create()
                    .WithPath("/v1/risk/list_entries")
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

        var response = await Client.Risk.Lists.AddAsync(
            new CreateRiskListEntryRequest
            {
                List = RiskList.Allow,
                Type = RiskListEntryType.Email,
                Value = "x",
                Note = null,
                ExpiresAt = null,
            }
        );
        JsonAssert.AreEqual(response, mockResponse);
    }

    [NUnit.Framework.Test]
    public async Task MockServerTest_2()
    {
        const string requestJson = """
            {
              "list": "block",
              "type": "domain",
              "value": "evil.example",
              "note": "Card testing"
            }
            """;

        const string mockResponse = """
            {
              "object": "risk_list_entry",
              "id": "rskle_01k7c8m4q2f3e9v6t5r1n0p8yz",
              "list": "block",
              "type": "domain",
              "value": "evil.example",
              "note": "Card testing",
              "expires_at": null,
              "created_at": "2026-01-15T09:30:00.000Z"
            }
            """;

        Server
            .Given(
                WireMock
                    .RequestBuilders.Request.Create()
                    .WithPath("/v1/risk/list_entries")
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

        var response = await Client.Risk.Lists.AddAsync(
            new CreateRiskListEntryRequest
            {
                List = RiskList.Block,
                Type = RiskListEntryType.Domain,
                Value = "evil.example",
                Note = "Card testing",
            }
        );
        JsonAssert.AreEqual(response, mockResponse);
    }
}
