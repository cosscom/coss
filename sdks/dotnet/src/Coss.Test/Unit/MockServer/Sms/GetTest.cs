using Coss;
using Coss.Test.Unit.MockServer;
using Coss.Test.Utils;
using NUnit.Framework;

namespace Coss.Test.Unit.MockServer.Sms;

[TestFixture]
[Parallelizable(ParallelScope.Self)]
public class GetTest : BaseMockServerTest
{
    [NUnit.Framework.Test]
    public async Task MockServerTest_1()
    {
        const string mockResponse = """
            {
              "object": "sms",
              "id": "id",
              "from": "from",
              "to": "to",
              "body": "body",
              "status": "queued",
              "segments": 1000000,
              "encoding": "gsm7",
              "country": "country",
              "tags": [
                {
                  "name": "name",
                  "value": "value"
                },
                {
                  "name": "name",
                  "value": "value"
                }
              ],
              "failure": {
                "code": "code",
                "message": "message"
              },
              "sandbox": true,
              "scheduled_at": "2024-01-15T09:30:00.000Z",
              "sent_at": "2024-01-15T09:30:00.000Z",
              "delivered_at": "2024-01-15T09:30:00.000Z",
              "created_at": "2024-01-15T09:30:00.000Z"
            }
            """;

        Server
            .Given(WireMock.RequestBuilders.Request.Create().WithPath("/v1/sms/id").UsingGet())
            .RespondWith(
                WireMock
                    .ResponseBuilders.Response.Create()
                    .WithStatusCode(200)
                    .WithBody(mockResponse)
            );

        var response = await Client.Sms.GetAsync(new GetSmsRequest { Id = "id" });
        JsonAssert.AreEqual(response, mockResponse);
    }

    [NUnit.Framework.Test]
    public async Task MockServerTest_2()
    {
        const string mockResponse = """
            {
              "object": "sms",
              "id": "sms_01k7c8m4q2f3e9v6t5r1n0p8yz",
              "from": "+14155550123",
              "to": "+14155550199",
              "body": "Your Acme code is 482913",
              "status": "delivered",
              "segments": 1,
              "encoding": "gsm7",
              "country": "US",
              "tags": [
                {
                  "name": "flow",
                  "value": "sign_in"
                }
              ],
              "failure": null,
              "sandbox": false,
              "scheduled_at": null,
              "sent_at": "2026-11-10T12:00:01.000Z",
              "delivered_at": "2026-11-10T12:00:04.000Z",
              "created_at": "2026-11-10T12:00:00.000Z"
            }
            """;

        Server
            .Given(
                WireMock
                    .RequestBuilders.Request.Create()
                    .WithPath("/v1/sms/sms_01k7c8m4q2f3e9v6t5r1n0p8yz")
                    .UsingGet()
            )
            .RespondWith(
                WireMock
                    .ResponseBuilders.Response.Create()
                    .WithStatusCode(200)
                    .WithBody(mockResponse)
            );

        var response = await Client.Sms.GetAsync(
            new GetSmsRequest { Id = "sms_01k7c8m4q2f3e9v6t5r1n0p8yz" }
        );
        JsonAssert.AreEqual(response, mockResponse);
    }
}
