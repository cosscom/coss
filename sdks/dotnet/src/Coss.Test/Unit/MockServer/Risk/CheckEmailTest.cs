using Coss;
using Coss.Test.Unit.MockServer;
using Coss.Test.Utils;
using NUnit.Framework;

namespace Coss.Test.Unit.MockServer.Risk;

[TestFixture]
[Parallelizable(ParallelScope.Self)]
public class CheckEmailTest : BaseMockServerTest
{
    [NUnit.Framework.Test]
    public async Task MockServerTest_1()
    {
        const string requestJson = """
            {
              "email": "x"
            }
            """;

        const string mockResponse = """
            {
              "object": "risk_email_check",
              "email": "email",
              "valid": true,
              "domain": "domain",
              "canonical": "canonical",
              "disposable": true,
              "deliverability": "deliverable",
              "role_account": true,
              "free_provider": true,
              "suggestion": "suggestion",
              "domain_age_days": 1000000,
              "degraded": [
                "email_dns",
                "email_dns"
              ]
            }
            """;

        Server
            .Given(
                WireMock
                    .RequestBuilders.Request.Create()
                    .WithPath("/v1/risk/email/check")
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

        var response = await Client.Risk.CheckEmailAsync(new RiskEmailCheckRequest { Email = "x" });
        JsonAssert.AreEqual(response, mockResponse);
    }

    [NUnit.Framework.Test]
    public async Task MockServerTest_2()
    {
        const string requestJson = """
            {
              "email": "ada@gnail.com"
            }
            """;

        const string mockResponse = """
            {
              "object": "risk_email_check",
              "email": "ada@gnail.com",
              "valid": true,
              "domain": "gnail.com",
              "canonical": "ada@gnail.com",
              "disposable": false,
              "deliverability": "deliverable",
              "role_account": false,
              "free_provider": false,
              "suggestion": "gmail.com",
              "domain_age_days": 7300,
              "degraded": [
                "email_dns"
              ]
            }
            """;

        Server
            .Given(
                WireMock
                    .RequestBuilders.Request.Create()
                    .WithPath("/v1/risk/email/check")
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

        var response = await Client.Risk.CheckEmailAsync(
            new RiskEmailCheckRequest { Email = "ada@gnail.com" }
        );
        JsonAssert.AreEqual(response, mockResponse);
    }
}
