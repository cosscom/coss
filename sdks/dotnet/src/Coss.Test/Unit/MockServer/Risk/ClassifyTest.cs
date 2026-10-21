using Coss;
using Coss.Test.Unit.MockServer;
using Coss.Test.Utils;
using NUnit.Framework;

namespace Coss.Test.Unit.MockServer.Risk;

[TestFixture]
[Parallelizable(ParallelScope.Self)]
public class ClassifyTest : BaseMockServerTest
{
    [NUnit.Framework.Test]
    public async Task MockServerTest_1()
    {
        const string requestJson = """
            {
              "text": "x"
            }
            """;

        const string mockResponse = """
            {
              "object": "risk_content_classification",
              "scores": {
                "spam": 1,
                "phishing": 1,
                "malware": 1,
                "fraud": 1
              },
              "truncated": true
            }
            """;

        Server
            .Given(
                WireMock
                    .RequestBuilders.Request.Create()
                    .WithPath("/v1/risk/content/classify")
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

        var response = await Client.Risk.ClassifyAsync(
            new RiskContentClassifyRequest { Text = "x" }
        );
        JsonAssert.AreEqual(response, mockResponse);
    }

    [NUnit.Framework.Test]
    public async Task MockServerTest_2()
    {
        const string requestJson = """
            {
              "text": "Earn $5,000 a week from home! DM me on Telegram: t.me/fast-cash"
            }
            """;

        const string mockResponse = """
            {
              "object": "risk_content_classification",
              "scores": {
                "spam": 0.91,
                "phishing": 0.04,
                "malware": 0.01,
                "fraud": 0.86
              },
              "truncated": false
            }
            """;

        Server
            .Given(
                WireMock
                    .RequestBuilders.Request.Create()
                    .WithPath("/v1/risk/content/classify")
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

        var response = await Client.Risk.ClassifyAsync(
            new RiskContentClassifyRequest
            {
                Text = "Earn $5,000 a week from home! DM me on Telegram: t.me/fast-cash",
            }
        );
        JsonAssert.AreEqual(response, mockResponse);
    }
}
