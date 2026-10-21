using Coss;
using Coss.Test.Unit.MockServer;
using Coss.Test.Utils;
using NUnit.Framework;

namespace Coss.Test.Unit.MockServer.Risk;

[TestFixture]
[Parallelizable(ParallelScope.Self)]
public class CheckIpTest : BaseMockServerTest
{
    [NUnit.Framework.Test]
    public async Task MockServerTest_1()
    {
        const string requestJson = """
            {
              "ip": "ip"
            }
            """;

        const string mockResponse = """
            {
              "version": 1.1,
              "private": true,
              "tor": true,
              "hosting": true,
              "hosting_provider": "hosting_provider",
              "hosting_kind": "cloud",
              "asn": 1000000,
              "as_name": "as_name",
              "country": "country",
              "privacy": {
                "vpn": true,
                "proxy": true,
                "relay": true,
                "service": "service"
              },
              "object": "risk_ip_check",
              "ip": "ip",
              "degraded": [
                "ip_data",
                "ip_data"
              ]
            }
            """;

        Server
            .Given(
                WireMock
                    .RequestBuilders.Request.Create()
                    .WithPath("/v1/risk/ip/check")
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

        var response = await Client.Risk.CheckIpAsync(new RiskIpCheckRequest { Ip = "ip" });
        JsonAssert.AreEqual(response, mockResponse);
    }

    [NUnit.Framework.Test]
    public async Task MockServerTest_2()
    {
        const string requestJson = """
            {
              "ip": "185.220.101.1"
            }
            """;

        const string mockResponse = """
            {
              "version": 4,
              "private": false,
              "tor": true,
              "hosting": false,
              "hosting_provider": null,
              "hosting_kind": null,
              "asn": 60729,
              "as_name": "Stiftung Erneuerbare Freiheit",
              "country": "DE",
              "privacy": null,
              "object": "risk_ip_check",
              "ip": "185.220.101.1",
              "degraded": [
                "ip_data"
              ]
            }
            """;

        Server
            .Given(
                WireMock
                    .RequestBuilders.Request.Create()
                    .WithPath("/v1/risk/ip/check")
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

        var response = await Client.Risk.CheckIpAsync(
            new RiskIpCheckRequest { Ip = "185.220.101.1" }
        );
        JsonAssert.AreEqual(response, mockResponse);
    }
}
