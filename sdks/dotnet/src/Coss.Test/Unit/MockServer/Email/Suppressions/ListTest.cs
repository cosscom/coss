using Coss.Test.Unit.MockServer;
using Coss.Test.Utils;
using NUnit.Framework;

namespace Coss.Test.Unit.MockServer.Email.Suppressions;

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
                  "object": "suppression",
                  "id": "id",
                  "address": "address",
                  "scope": "scope",
                  "reason": "bounce",
                  "email_id": "email_id",
                  "created_at": "2024-01-15T09:30:00.000Z"
                },
                {
                  "object": "suppression",
                  "id": "id",
                  "address": "address",
                  "scope": "scope",
                  "reason": "bounce",
                  "email_id": "email_id",
                  "created_at": "2024-01-15T09:30:00.000Z"
                }
              ],
              "has_more": true
            }
            """;

        Server
            .Given(
                WireMock.RequestBuilders.Request.Create().WithPath("/v1/suppressions").UsingGet()
            )
            .RespondWith(
                WireMock
                    .ResponseBuilders.Response.Create()
                    .WithStatusCode(200)
                    .WithBody(mockResponse)
            );

        var response = await Client.Email.Suppressions.ListAsync(
            new Coss.Email.ListSuppressionsRequest()
        );
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
                  "object": "suppression",
                  "id": "sup_01k7c8m4q2f3e9v6t5r1n0p8yz",
                  "address": "user@example.com",
                  "scope": "marketing",
                  "reason": "manual",
                  "email_id": null,
                  "created_at": "2026-01-15T09:30:00.000Z"
                }
              ],
              "has_more": false
            }
            """;

        Server
            .Given(
                WireMock.RequestBuilders.Request.Create().WithPath("/v1/suppressions").UsingGet()
            )
            .RespondWith(
                WireMock
                    .ResponseBuilders.Response.Create()
                    .WithStatusCode(200)
                    .WithBody(mockResponse)
            );

        var response = await Client.Email.Suppressions.ListAsync(
            new Coss.Email.ListSuppressionsRequest()
        );
        JsonAssert.AreEqual(response, mockResponse);
    }
}
