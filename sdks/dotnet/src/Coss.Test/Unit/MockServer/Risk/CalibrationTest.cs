using Coss.Test.Unit.MockServer;
using Coss.Test.Utils;
using NUnit.Framework;

namespace Coss.Test.Unit.MockServer.Risk;

[TestFixture]
[Parallelizable(ParallelScope.Self)]
public class CalibrationTest : BaseMockServerTest
{
    [NUnit.Framework.Test]
    public async Task MockServerTest_1()
    {
        const string mockResponse = """
            {
              "object": "risk_calibration",
              "window_days": 1000000,
              "assessments": 1000000,
              "labeled": 1000000,
              "reasons": [
                {
                  "code": "email.invalid",
                  "fired": 1000000,
                  "fraud": 1000000,
                  "legitimate": 1000000,
                  "precision": 1.1,
                  "default_weight": 1.1,
                  "weight": 1.1,
                  "suggested_weight": 1.1
                },
                {
                  "code": "email.invalid",
                  "fired": 1000000,
                  "fraud": 1000000,
                  "legitimate": 1000000,
                  "precision": 1.1,
                  "default_weight": 1.1,
                  "weight": 1.1,
                  "suggested_weight": 1.1
                }
              ],
              "rules": [
                {
                  "rule": "rule",
                  "name": "name",
                  "matched": 1000000,
                  "fraud": 1000000,
                  "legitimate": 1000000,
                  "precision": 1.1
                },
                {
                  "rule": "rule",
                  "name": "name",
                  "matched": 1000000,
                  "fraud": 1000000,
                  "legitimate": 1000000,
                  "precision": 1.1
                }
              ]
            }
            """;

        Server
            .Given(
                WireMock
                    .RequestBuilders.Request.Create()
                    .WithPath("/v1/risk/calibration")
                    .UsingGet()
            )
            .RespondWith(
                WireMock
                    .ResponseBuilders.Response.Create()
                    .WithStatusCode(200)
                    .WithBody(mockResponse)
            );

        var response = await Client.Risk.CalibrationAsync();
        JsonAssert.AreEqual(response, mockResponse);
    }

    [NUnit.Framework.Test]
    public async Task MockServerTest_2()
    {
        const string mockResponse = """
            {
              "object": "risk_calibration",
              "window_days": 90,
              "assessments": 1840,
              "labeled": 212,
              "reasons": [
                {
                  "code": "ip.hosting_provider",
                  "fired": 96,
                  "fraud": 4,
                  "legitimate": 38,
                  "precision": 0.095,
                  "default_weight": 0.25,
                  "weight": 0.25,
                  "suggested_weight": 0.16
                }
              ],
              "rules": [
                {
                  "rule": "rskrule_01k7c8m4q2f3e9v6t5r1n0p8yz",
                  "name": "Disposable email from a data center",
                  "matched": 31,
                  "fraud": 12,
                  "legitimate": 1,
                  "precision": 0.923
                }
              ]
            }
            """;

        Server
            .Given(
                WireMock
                    .RequestBuilders.Request.Create()
                    .WithPath("/v1/risk/calibration")
                    .UsingGet()
            )
            .RespondWith(
                WireMock
                    .ResponseBuilders.Response.Create()
                    .WithStatusCode(200)
                    .WithBody(mockResponse)
            );

        var response = await Client.Risk.CalibrationAsync();
        JsonAssert.AreEqual(response, mockResponse);
    }
}
