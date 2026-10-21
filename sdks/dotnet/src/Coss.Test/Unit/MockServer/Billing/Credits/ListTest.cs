using Coss.Billing;
using Coss.Test.Unit.MockServer;
using Coss.Test.Utils;
using NUnit.Framework;

namespace Coss.Test.Unit.MockServer.Billing.Credits;

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
                  "object": "credit",
                  "id": "id",
                  "kind": "amount",
                  "amount": 1000000,
                  "remaining": 1000000,
                  "meter": "email.recipients",
                  "meters": [
                    "email.recipients",
                    "email.recipients"
                  ],
                  "applies_to": "usage",
                  "source": "fee",
                  "description": "description",
                  "effective_at": "2024-01-15T09:30:00.000Z",
                  "expires_at": "2024-01-15T09:30:00.000Z",
                  "voided_at": "2024-01-15T09:30:00.000Z",
                  "created_at": "2024-01-15T09:30:00.000Z"
                },
                {
                  "object": "credit",
                  "id": "id",
                  "kind": "amount",
                  "amount": 1000000,
                  "remaining": 1000000,
                  "meter": "email.recipients",
                  "meters": [
                    "email.recipients",
                    "email.recipients"
                  ],
                  "applies_to": "usage",
                  "source": "fee",
                  "description": "description",
                  "effective_at": "2024-01-15T09:30:00.000Z",
                  "expires_at": "2024-01-15T09:30:00.000Z",
                  "voided_at": "2024-01-15T09:30:00.000Z",
                  "created_at": "2024-01-15T09:30:00.000Z"
                }
              ],
              "has_more": true
            }
            """;

        Server
            .Given(
                WireMock.RequestBuilders.Request.Create().WithPath("/v1/billing/credits").UsingGet()
            )
            .RespondWith(
                WireMock
                    .ResponseBuilders.Response.Create()
                    .WithStatusCode(200)
                    .WithBody(mockResponse)
            );

        var response = await Client.Billing.Credits.ListAsync(new ListCreditsRequest());
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
                  "object": "credit",
                  "id": "bcg_01k7c8m4q2f3e9v6t5r1n0p8yz",
                  "kind": "units",
                  "amount": 50000,
                  "remaining": 12000,
                  "meter": "email.recipients",
                  "applies_to": "usage",
                  "source": "support",
                  "description": "Migration credit",
                  "effective_at": "2026-10-01T00:00:00.000Z",
                  "expires_at": "2027-01-01T00:00:00.000Z",
                  "created_at": "2026-10-01T09:30:00.000Z"
                }
              ],
              "has_more": false
            }
            """;

        Server
            .Given(
                WireMock.RequestBuilders.Request.Create().WithPath("/v1/billing/credits").UsingGet()
            )
            .RespondWith(
                WireMock
                    .ResponseBuilders.Response.Create()
                    .WithStatusCode(200)
                    .WithBody(mockResponse)
            );

        var response = await Client.Billing.Credits.ListAsync(new ListCreditsRequest());
        JsonAssert.AreEqual(response, mockResponse);
    }
}
