using Coss.Test.Unit.MockServer;
using Coss.Test.Utils;
using NUnit.Framework;

namespace Coss.Test.Unit.MockServer.Sms.Received;

[TestFixture]
[Parallelizable(ParallelScope.Self)]
public class ListTest : BaseMockServerTest
{
    [NUnit.Framework.Test]
    public async Task MockServerTest_1()
    {
        const string mockResponse = """
            {
              "object": "list",
              "data": [
                {
                  "object": "received_sms",
                  "id": "id",
                  "from": "from",
                  "to": "to",
                  "body": "body",
                  "segments": 1000000,
                  "keyword": "stop",
                  "sandbox": true,
                  "created_at": "2024-01-15T09:30:00.000Z"
                },
                {
                  "object": "received_sms",
                  "id": "id",
                  "from": "from",
                  "to": "to",
                  "body": "body",
                  "segments": 1000000,
                  "keyword": "stop",
                  "sandbox": true,
                  "created_at": "2024-01-15T09:30:00.000Z"
                }
              ],
              "has_more": true
            }
            """;

        Server
            .Given(
                WireMock.RequestBuilders.Request.Create().WithPath("/v1/sms/received").UsingGet()
            )
            .RespondWith(
                WireMock
                    .ResponseBuilders.Response.Create()
                    .WithStatusCode(200)
                    .WithBody(mockResponse)
            );

        var response = await Client.Sms.Received.ListAsync(new Coss.Sms_.ListReceivedRequest());
        JsonAssert.AreEqual(response, mockResponse);
    }

    [NUnit.Framework.Test]
    public async Task MockServerTest_2()
    {
        const string mockResponse = """
            {
              "object": "list",
              "data": [
                {
                  "object": "received_sms",
                  "id": "smsin_01k7c8m4q2f3e9v6t5r1n0p8yz",
                  "from": "+14155550199",
                  "to": "+14155550123",
                  "body": "Thanks, see you then!",
                  "segments": 1,
                  "sandbox": false,
                  "created_at": "2026-11-10T12:05:00.000Z"
                }
              ],
              "has_more": false
            }
            """;

        Server
            .Given(
                WireMock.RequestBuilders.Request.Create().WithPath("/v1/sms/received").UsingGet()
            )
            .RespondWith(
                WireMock
                    .ResponseBuilders.Response.Create()
                    .WithStatusCode(200)
                    .WithBody(mockResponse)
            );

        var response = await Client.Sms.Received.ListAsync(new Coss.Sms_.ListReceivedRequest());
        JsonAssert.AreEqual(response, mockResponse);
    }
}
