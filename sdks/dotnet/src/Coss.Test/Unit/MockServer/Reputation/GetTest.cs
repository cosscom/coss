using Coss.Test.Unit.MockServer;
using Coss.Test.Utils;
using NUnit.Framework;

namespace Coss.Test.Unit.MockServer.Reputation;

[TestFixture]
[Parallelizable(ParallelScope.Self)]
public class GetTest : BaseMockServerTest
{
    [NUnit.Framework.Test]
    public async Task MockServerTest_1()
    {
        const string mockResponse = """
            {
              "object": "reputation",
              "status": "good",
              "reason": "reason",
              "status_changed_at": "2024-01-15T09:30:00.000Z",
              "evaluated_at": "2024-01-15T09:30:00.000Z",
              "window": {
                "start": "2024-01-15T09:30:00.000Z",
                "end": "2024-01-15T09:30:00.000Z"
              },
              "checks": [
                {
                  "trigger": "trigger",
                  "severity": "ok",
                  "message": "message",
                  "rate": 1.1,
                  "count": 1000000,
                  "volume": 1000000,
                  "warning_threshold": 1.1,
                  "suspend_threshold": 1.1,
                  "minimum_volume": 1000000
                },
                {
                  "trigger": "trigger",
                  "severity": "ok",
                  "message": "message",
                  "rate": 1.1,
                  "count": 1000000,
                  "volume": 1000000,
                  "warning_threshold": 1.1,
                  "suspend_threshold": 1.1,
                  "minimum_volume": 1000000
                }
              ],
              "marketing": {
                "status": "active",
                "reason": "reason",
                "paused_at": "2024-01-15T09:30:00.000Z"
              }
            }
            """;

        Server
            .Given(WireMock.RequestBuilders.Request.Create().WithPath("/v1/reputation").UsingGet())
            .RespondWith(
                WireMock
                    .ResponseBuilders.Response.Create()
                    .WithStatusCode(200)
                    .WithBody(mockResponse)
            );

        var response = await Client.Reputation.GetAsync();
        JsonAssert.AreEqual(response, mockResponse);
    }

    [NUnit.Framework.Test]
    public async Task MockServerTest_2()
    {
        const string mockResponse = """
            {
              "object": "reputation",
              "status": "good",
              "reason": "complaint_rate",
              "status_changed_at": "2024-01-15T09:30:00.000Z",
              "evaluated_at": "2024-01-15T09:30:00.000Z",
              "window": {
                "start": "2024-01-15T09:30:00.000Z",
                "end": "2024-01-15T09:30:00.000Z"
              },
              "checks": [
                {
                  "trigger": "bounce_rate",
                  "severity": "ok",
                  "message": "message",
                  "rate": 1.1,
                  "count": 1000000,
                  "volume": 1000000,
                  "warning_threshold": 1.1,
                  "suspend_threshold": 1.1,
                  "minimum_volume": 1000000
                }
              ],
              "marketing": {
                "status": "active",
                "reason": "marketing_complaint_rate",
                "paused_at": "2024-01-15T09:30:00.000Z"
              }
            }
            """;

        Server
            .Given(WireMock.RequestBuilders.Request.Create().WithPath("/v1/reputation").UsingGet())
            .RespondWith(
                WireMock
                    .ResponseBuilders.Response.Create()
                    .WithStatusCode(200)
                    .WithBody(mockResponse)
            );

        var response = await Client.Reputation.GetAsync();
        JsonAssert.AreEqual(response, mockResponse);
    }
}
