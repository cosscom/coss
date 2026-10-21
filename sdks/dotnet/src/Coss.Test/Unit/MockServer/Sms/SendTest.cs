using Coss;
using Coss.Test.Unit.MockServer;
using Coss.Test.Utils;
using NUnit.Framework;

namespace Coss.Test.Unit.MockServer.Sms;

[TestFixture]
[Parallelizable(ParallelScope.Self)]
public class SendTest : BaseMockServerTest
{
    [NUnit.Framework.Test]
    public async Task MockServerTest_1()
    {
        const string requestJson = """
            {
              "from": "from",
              "to": "to",
              "body": "x"
            }
            """;

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
            .Given(
                WireMock
                    .RequestBuilders.Request.Create()
                    .WithPath("/v1/sms")
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

        var response = await Client.Sms.SendAsync(
            new SendSmsRequest
            {
                From = "from",
                To = "to",
                Body = "x",
                Tags = null,
                ScheduledAt = null,
            }
        );
        JsonAssert.AreEqual(response, mockResponse);
    }

    [NUnit.Framework.Test]
    public async Task MockServerTest_2()
    {
        const string requestJson = """
            {
              "from": "+14155550123",
              "to": "+14155550199",
              "body": "Your Acme code is 482913",
              "tags": [
                {
                  "name": "flow",
                  "value": "sign_in"
                }
              ]
            }
            """;

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
              "sandbox": false,
              "sent_at": "2026-11-10T12:00:01.000Z",
              "delivered_at": "2026-11-10T12:00:04.000Z",
              "created_at": "2026-11-10T12:00:00.000Z"
            }
            """;

        Server
            .Given(
                WireMock
                    .RequestBuilders.Request.Create()
                    .WithPath("/v1/sms")
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

        var response = await Client.Sms.SendAsync(
            new SendSmsRequest
            {
                IdempotencyKey = "welcome-user-123",
                From = "+14155550123",
                To = "+14155550199",
                Body = "Your Acme code is 482913",
                Tags = new List<SendSmsRequestTagsItem>()
                {
                    new SendSmsRequestTagsItem { Name = "flow", Value = "sign_in" },
                },
            }
        );
        JsonAssert.AreEqual(response, mockResponse);
    }
}
