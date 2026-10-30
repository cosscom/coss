using Coss;
using Coss.Test.Unit.MockServer;
using Coss.Test.Utils;
using NUnit.Framework;

namespace Coss.Test.Unit.MockServer.Verify;

[TestFixture]
[Parallelizable(ParallelScope.Self)]
public class CheckTest : BaseMockServerTest
{
    [NUnit.Framework.Test]
    public async Task MockServerTest_1()
    {
        const string requestJson = """
            {
              "code": "code"
            }
            """;

        const string mockResponse = """
            {
              "object": "verification_check",
              "valid": true,
              "verification": {
                "object": "verification",
                "id": "id",
                "channel": "sms",
                "to": "to",
                "country": "country",
                "status": "pending",
                "failure": {
                  "code": "code",
                  "message": "message"
                },
                "reasons": [
                  {
                    "code": "code",
                    "value": 1.1
                  },
                  {
                    "code": "code",
                    "value": 1.1
                  }
                ],
                "attempts": 1000000,
                "max_attempts": 1000000,
                "sends": [
                  {
                    "channel": "sms",
                    "route": "own_number",
                    "sms_id": "sms_id",
                    "email_id": "email_id",
                    "created_at": "2024-01-15T09:30:00.000Z"
                  },
                  {
                    "channel": "sms",
                    "route": "own_number",
                    "sms_id": "sms_id",
                    "email_id": "email_id",
                    "created_at": "2024-01-15T09:30:00.000Z"
                  }
                ],
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
                "sandbox": true,
                "expires_at": "2024-01-15T09:30:00.000Z",
                "approved_at": "2024-01-15T09:30:00.000Z",
                "created_at": "2024-01-15T09:30:00.000Z"
              }
            }
            """;

        Server
            .Given(
                WireMock
                    .RequestBuilders.Request.Create()
                    .WithPath("/v1/verifications/check")
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

        var response = await Client.Verify.CheckAsync(
            new CheckVerificationRequest
            {
                VerificationId = null,
                To = null,
                Code = "code",
            }
        );
        JsonAssert.AreEqual(response, mockResponse);
    }

    [NUnit.Framework.Test]
    public async Task MockServerTest_2()
    {
        const string requestJson = """
            {
              "to": "+14155550199",
              "code": "482913"
            }
            """;

        const string mockResponse = """
            {
              "object": "verification_check",
              "valid": true,
              "verification": {
                "object": "verification",
                "id": "vrf_01k8e2m4q2f3e9v6t5r1n0p8yz",
                "channel": "sms",
                "to": "+14155550199",
                "country": "US",
                "status": "approved",
                "failure": null,
                "reasons": [
                  {
                    "code": "code"
                  }
                ],
                "attempts": 0,
                "max_attempts": 5,
                "sends": [
                  {
                    "channel": "sms",
                    "route": "own_number",
                    "sms_id": null,
                    "email_id": null,
                    "created_at": "2024-01-15T09:30:00.000Z"
                  }
                ],
                "tags": [
                  {
                    "name": "name",
                    "value": "value"
                  }
                ],
                "sandbox": false,
                "expires_at": "2026-11-10T12:10:00.000Z",
                "approved_at": "2026-11-10T12:00:41.000Z",
                "created_at": "2026-11-10T12:00:00.000Z"
              }
            }
            """;

        Server
            .Given(
                WireMock
                    .RequestBuilders.Request.Create()
                    .WithPath("/v1/verifications/check")
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

        var response = await Client.Verify.CheckAsync(
            new CheckVerificationRequest
            {
                IdempotencyKey = "welcome-user-123",
                To = "+14155550199",
                Code = "482913",
            }
        );
        JsonAssert.AreEqual(response, mockResponse);
    }
}
