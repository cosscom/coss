using Coss.Test.Unit.MockServer;
using Coss.Test.Utils;
using NUnit.Framework;

namespace Coss.Test.Unit.MockServer.Email.DedicatedIps;

[TestFixture]
[Parallelizable(ParallelScope.Self)]
public class GetTest : BaseMockServerTest
{
    [NUnit.Framework.Test]
    public async Task MockServerTest_1()
    {
        const string mockResponse = """
            {
              "object": "dedicated_ip_pool",
              "status": "not_enabled",
              "ips": [
                {
                  "ip": "ip",
                  "delivered_7d": 1000000
                },
                {
                  "ip": "ip",
                  "delivered_7d": 1000000
                }
              ],
              "dedicated_share": 1.1,
              "message": "message",
              "created_at": "2024-01-15T09:30:00.000Z",
              "ready_at": "2024-01-15T09:30:00.000Z"
            }
            """;

        Server
            .Given(
                WireMock.RequestBuilders.Request.Create().WithPath("/v1/dedicated_ips").UsingGet()
            )
            .RespondWith(
                WireMock
                    .ResponseBuilders.Response.Create()
                    .WithStatusCode(200)
                    .WithBody(mockResponse)
            );

        var response = await Client.Email.DedicatedIps.GetAsync();
        JsonAssert.AreEqual(response, mockResponse);
    }

    [NUnit.Framework.Test]
    public async Task MockServerTest_2()
    {
        const string mockResponse = """
            {
              "object": "dedicated_ip_pool",
              "status": "warming",
              "ips": [
                {
                  "ip": "198.51.100.10",
                  "delivered_7d": 18420
                }
              ],
              "dedicated_share": 0.72,
              "created_at": "2026-10-12T09:31:00.000Z"
            }
            """;

        Server
            .Given(
                WireMock.RequestBuilders.Request.Create().WithPath("/v1/dedicated_ips").UsingGet()
            )
            .RespondWith(
                WireMock
                    .ResponseBuilders.Response.Create()
                    .WithStatusCode(200)
                    .WithBody(mockResponse)
            );

        var response = await Client.Email.DedicatedIps.GetAsync();
        JsonAssert.AreEqual(response, mockResponse);
    }
}
