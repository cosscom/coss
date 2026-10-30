using Coss.Email;
using Coss.Test.Unit.MockServer;
using Coss.Test.Utils;
using NUnit.Framework;

namespace Coss.Test.Unit.MockServer.Email.Subaccounts;

[TestFixture]
[Parallelizable(ParallelScope.Self)]
public class StatsTest : BaseMockServerTest
{
    [NUnit.Framework.Test]
    public async Task MockServerTest_1()
    {
        const string mockResponse = """
            {
              "object": "subaccount_stats",
              "subaccount_id": "subaccount_id",
              "from": "2023-01-15",
              "to": "2023-01-15",
              "data": [
                {
                  "date": "2023-01-15",
                  "recipients": 1000000,
                  "sent": 1000000,
                  "delivered": 1000000,
                  "bounced": 1000000,
                  "complained": 1000000,
                  "failed": 1000000,
                  "suppressed": 1000000
                },
                {
                  "date": "2023-01-15",
                  "recipients": 1000000,
                  "sent": 1000000,
                  "delivered": 1000000,
                  "bounced": 1000000,
                  "complained": 1000000,
                  "failed": 1000000,
                  "suppressed": 1000000
                }
              ]
            }
            """;

        Server
            .Given(
                WireMock
                    .RequestBuilders.Request.Create()
                    .WithPath("/v1/subaccounts/subaccount/stats")
                    .UsingGet()
            )
            .RespondWith(
                WireMock
                    .ResponseBuilders.Response.Create()
                    .WithStatusCode(200)
                    .WithBody(mockResponse)
            );

        var response = await Client.Email.Subaccounts.StatsAsync(
            new StatsSubaccountsRequest { Subaccount = "subaccount" }
        );
        JsonAssert.AreEqual(response, mockResponse);
    }

    [NUnit.Framework.Test]
    public async Task MockServerTest_2()
    {
        const string mockResponse = """
            {
              "object": "subaccount_stats",
              "subaccount_id": "sub_01k7c8m4q2f3e9v6t5r1n0p8yz",
              "from": "2026-10-15",
              "to": "2026-10-15",
              "data": [
                {
                  "date": "2026-10-15",
                  "recipients": 120,
                  "sent": 118,
                  "delivered": 115,
                  "bounced": 2,
                  "complained": 0,
                  "failed": 0,
                  "suppressed": 2
                }
              ]
            }
            """;

        Server
            .Given(
                WireMock
                    .RequestBuilders.Request.Create()
                    .WithPath("/v1/subaccounts/user_8812/stats")
                    .WithParam("from", "2026-10-01")
                    .WithParam("to", "2026-10-15")
                    .UsingGet()
            )
            .RespondWith(
                WireMock
                    .ResponseBuilders.Response.Create()
                    .WithStatusCode(200)
                    .WithBody(mockResponse)
            );

        var response = await Client.Email.Subaccounts.StatsAsync(
            new StatsSubaccountsRequest
            {
                Subaccount = "user_8812",
                From = new DateOnly(2026, 10, 1),
                To = new DateOnly(2026, 10, 15),
            }
        );
        JsonAssert.AreEqual(response, mockResponse);
    }
}
