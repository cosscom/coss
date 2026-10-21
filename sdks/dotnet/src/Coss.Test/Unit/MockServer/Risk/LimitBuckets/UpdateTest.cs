using Coss.Risk;
using Coss.Test.Unit.MockServer;
using Coss.Test.Utils;
using NUnit.Framework;

namespace Coss.Test.Unit.MockServer.Risk.LimitBuckets;

[TestFixture]
[Parallelizable(ParallelScope.Self)]
public class UpdateTest : BaseMockServerTest
{
    [NUnit.Framework.Test]
    public async Task MockServerTest_1()
    {
        const string requestJson = """
            {}
            """;

        const string mockResponse = """
            {
              "object": "risk_limit_bucket",
              "id": "id",
              "name": "name",
              "limit": 1000000,
              "period_seconds": 1000000,
              "burst": 1000000,
              "on_failure": "allow",
              "created_at": "2024-01-15T09:30:00.000Z",
              "updated_at": "2024-01-15T09:30:00.000Z"
            }
            """;

        Server
            .Given(
                WireMock
                    .RequestBuilders.Request.Create()
                    .WithPath("/v1/risk/limit_buckets/id")
                    .WithHeader("Content-Type", "application/json")
                    .UsingPatch()
                    .WithBodyAsJson(requestJson)
            )
            .RespondWith(
                WireMock
                    .ResponseBuilders.Response.Create()
                    .WithStatusCode(200)
                    .WithBody(mockResponse)
            );

        var response = await Client.Risk.LimitBuckets.UpdateAsync(
            new UpdateRiskLimitBucketRequest
            {
                Id = "id",
                Limit = null,
                PeriodSeconds = null,
                Burst = null,
                OnFailure = null,
            }
        );
        JsonAssert.AreEqual(response, mockResponse);
    }

    [NUnit.Framework.Test]
    public async Task MockServerTest_2()
    {
        const string requestJson = """
            {
              "limit": 10,
              "burst": 20
            }
            """;

        const string mockResponse = """
            {
              "object": "risk_limit_bucket",
              "id": "rsklb_01k7c8m4q2f3e9v6t5r1n0p8yz",
              "name": "password_reset",
              "limit": 5,
              "period_seconds": 3600,
              "burst": 5,
              "on_failure": "allow",
              "created_at": "2026-01-15T09:30:00.000Z",
              "updated_at": "2026-01-15T09:30:00.000Z"
            }
            """;

        Server
            .Given(
                WireMock
                    .RequestBuilders.Request.Create()
                    .WithPath("/v1/risk/limit_buckets/rsklb_01k7c8m4q2f3e9v6t5r1n0p8yz")
                    .WithHeader("Content-Type", "application/json")
                    .UsingPatch()
                    .WithBodyAsJson(requestJson)
            )
            .RespondWith(
                WireMock
                    .ResponseBuilders.Response.Create()
                    .WithStatusCode(200)
                    .WithBody(mockResponse)
            );

        var response = await Client.Risk.LimitBuckets.UpdateAsync(
            new UpdateRiskLimitBucketRequest
            {
                Id = "rsklb_01k7c8m4q2f3e9v6t5r1n0p8yz",
                Limit = 10,
                Burst = 20,
            }
        );
        JsonAssert.AreEqual(response, mockResponse);
    }
}
