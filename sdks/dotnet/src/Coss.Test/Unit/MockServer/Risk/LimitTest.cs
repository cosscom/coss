using Coss;
using Coss.Test.Unit.MockServer;
using Coss.Test.Utils;
using NUnit.Framework;

namespace Coss.Test.Unit.MockServer.Risk;

[TestFixture]
[Parallelizable(ParallelScope.Self)]
public class LimitTest : BaseMockServerTest
{
    [NUnit.Framework.Test]
    public async Task MockServerTest_1()
    {
        const string requestJson = """
            {
              "bucket": "bucket",
              "key": "x"
            }
            """;

        const string mockResponse = """
            {
              "object": "risk_limit",
              "bucket": "bucket",
              "allowed": true,
              "limit": 1000000,
              "remaining": 1000000,
              "reset_ms": 1000000,
              "retry_after_ms": 1000000,
              "degraded": true
            }
            """;

        Server
            .Given(
                WireMock
                    .RequestBuilders.Request.Create()
                    .WithPath("/v1/risk/limits")
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

        var response = await Client.Risk.LimitAsync(
            new CheckRiskLimitRequest
            {
                Bucket = "bucket",
                Key = "x",
                Cost = null,
            }
        );
        JsonAssert.AreEqual(response, mockResponse);
    }

    [NUnit.Framework.Test]
    public async Task MockServerTest_2()
    {
        const string requestJson = """
            {
              "bucket": "password_reset",
              "key": "ada@example.com"
            }
            """;

        const string mockResponse = """
            {
              "object": "risk_limit",
              "bucket": "password_reset",
              "allowed": true,
              "limit": 5,
              "remaining": 4,
              "reset_ms": 720000,
              "retry_after_ms": 0,
              "degraded": false
            }
            """;

        Server
            .Given(
                WireMock
                    .RequestBuilders.Request.Create()
                    .WithPath("/v1/risk/limits")
                    .WithHeader("Idempotency-Key", "welcome-user-123")
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

        var response = await Client.Risk.LimitAsync(
            new CheckRiskLimitRequest
            {
                IdempotencyKey = "welcome-user-123",
                Bucket = "password_reset",
                Key = "ada@example.com",
            }
        );
        JsonAssert.AreEqual(response, mockResponse);
    }
}
