using Coss;
using Coss.Test.Unit.MockServer;
using Coss.Test.Utils;
using NUnit.Framework;

namespace Coss.Test.Unit.MockServer.Risk;

[TestFixture]
[Parallelizable(ParallelScope.Self)]
public class CheckPhoneTest : BaseMockServerTest
{
    [NUnit.Framework.Test]
    public async Task MockServerTest_1()
    {
        const string requestJson = """
            {
              "phone": "x"
            }
            """;

        const string mockResponse = """
            {
              "object": "risk_phone_check",
              "phone": "phone",
              "valid": true,
              "country": "country",
              "line_type": "mobile",
              "carrier": {
                "name": "name",
                "mobile_country_code": "mobile_country_code",
                "mobile_network_code": "mobile_network_code"
              },
              "sim_swap": {
                "recent": true,
                "swapped_at": "swapped_at",
                "period": "period"
              },
              "degraded": [
                "phone_data",
                "phone_data"
              ]
            }
            """;

        Server
            .Given(
                WireMock
                    .RequestBuilders.Request.Create()
                    .WithPath("/v1/risk/phone/check")
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

        var response = await Client.Risk.CheckPhoneAsync(new RiskPhoneCheckRequest { Phone = "x" });
        JsonAssert.AreEqual(response, mockResponse);
    }

    [NUnit.Framework.Test]
    public async Task MockServerTest_2()
    {
        const string requestJson = """
            {
              "phone": "+14155550123"
            }
            """;

        const string mockResponse = """
            {
              "object": "risk_phone_check",
              "phone": "+14155550123",
              "valid": true,
              "country": "US",
              "line_type": "mobile",
              "carrier": {
                "name": "T-Mobile USA, Inc.",
                "mobile_country_code": "310",
                "mobile_network_code": "260"
              },
              "sim_swap": null,
              "degraded": [
                "phone_data"
              ]
            }
            """;

        Server
            .Given(
                WireMock
                    .RequestBuilders.Request.Create()
                    .WithPath("/v1/risk/phone/check")
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

        var response = await Client.Risk.CheckPhoneAsync(
            new RiskPhoneCheckRequest { Phone = "+14155550123" }
        );
        JsonAssert.AreEqual(response, mockResponse);
    }
}
