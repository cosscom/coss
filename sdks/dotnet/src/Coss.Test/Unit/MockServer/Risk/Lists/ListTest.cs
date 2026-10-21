using Coss.Risk;
using Coss.Test.Unit.MockServer;
using Coss.Test.Utils;
using NUnit.Framework;

namespace Coss.Test.Unit.MockServer.Risk.Lists;

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
                  "object": "risk_list_entry",
                  "id": "id",
                  "list": "allow",
                  "type": "email",
                  "value": "value",
                  "note": "note",
                  "expires_at": "2024-01-15T09:30:00.000Z",
                  "created_at": "2024-01-15T09:30:00.000Z"
                },
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
              ],
              "has_more": true
            }
            """;

        Server
            .Given(
                WireMock
                    .RequestBuilders.Request.Create()
                    .WithPath("/v1/risk/list_entries")
                    .UsingGet()
            )
            .RespondWith(
                WireMock
                    .ResponseBuilders.Response.Create()
                    .WithStatusCode(200)
                    .WithBody(mockResponse)
            );

        var response = await Client.Risk.Lists.ListAsync(new ListListsRequest());
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
                  "object": "risk_list_entry",
                  "id": "rskle_01k7c8m4q2f3e9v6t5r1n0p8yz",
                  "list": "block",
                  "type": "domain",
                  "value": "evil.example",
                  "note": "Card testing",
                  "created_at": "2026-01-15T09:30:00.000Z"
                }
              ],
              "has_more": false
            }
            """;

        Server
            .Given(
                WireMock
                    .RequestBuilders.Request.Create()
                    .WithPath("/v1/risk/list_entries")
                    .UsingGet()
            )
            .RespondWith(
                WireMock
                    .ResponseBuilders.Response.Create()
                    .WithStatusCode(200)
                    .WithBody(mockResponse)
            );

        var response = await Client.Risk.Lists.ListAsync(new ListListsRequest());
        JsonAssert.AreEqual(response, mockResponse);
    }
}
