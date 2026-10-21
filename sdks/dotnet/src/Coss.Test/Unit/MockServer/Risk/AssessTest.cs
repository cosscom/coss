using Coss;
using Coss.Test.Unit.MockServer;
using Coss.Test.Utils;
using NUnit.Framework;

namespace Coss.Test.Unit.MockServer.Risk;

[TestFixture]
[Parallelizable(ParallelScope.Self)]
public class AssessTest : BaseMockServerTest
{
    [NUnit.Framework.Test]
    public async Task MockServerTest_1()
    {
        const string requestJson = """
            {
              "event": "signup"
            }
            """;

        const string mockResponse = """
            {
              "object": "risk_assessment",
              "id": "id",
              "event": "signup",
              "event_name": "event_name",
              "decision": "allow",
              "score": 1,
              "reasons": [
                {
                  "code": "email.invalid",
                  "message": "message",
                  "value": 1.1,
                  "threshold": 1.1,
                  "window": "1h",
                  "suggestion": "suggestion",
                  "provider": "provider",
                  "previous_user": "previous_user",
                  "previous_assessment": "previous_assessment",
                  "entry": "entry",
                  "rule": "rule",
                  "name": "name",
                  "type": "email"
                },
                {
                  "code": "email.invalid",
                  "message": "message",
                  "value": 1.1,
                  "threshold": 1.1,
                  "window": "1h",
                  "suggestion": "suggestion",
                  "provider": "provider",
                  "previous_user": "previous_user",
                  "previous_assessment": "previous_assessment",
                  "entry": "entry",
                  "rule": "rule",
                  "name": "name",
                  "type": "email"
                }
              ],
              "signals": {
                "email": {
                  "domain": "domain",
                  "valid": true,
                  "disposable": true,
                  "deliverability": "deliverable",
                  "role_account": true,
                  "free_provider": true,
                  "suggestion": "suggestion",
                  "domain_age_days": 1000000
                },
                "ip": {
                  "version": 1.1,
                  "private": true,
                  "tor": true,
                  "hosting": true,
                  "hosting_provider": "hosting_provider",
                  "hosting_kind": "cloud",
                  "asn": 1000000,
                  "as_name": "as_name",
                  "country": "country",
                  "privacy": {
                    "vpn": true,
                    "proxy": true,
                    "relay": true,
                    "service": "service"
                  }
                },
                "velocity": {
                  "velocity": 1000000
                },
                "captcha": {
                  "provided": true,
                  "passed": true
                },
                "login": {
                  "new_country": true,
                  "new_network": true
                },
                "content": {
                  "spam": 1,
                  "phishing": 1,
                  "malware": 1,
                  "fraud": 1
                },
                "checkout": {
                  "amount": 1000000,
                  "currency": "currency",
                  "card_country": "card_country",
                  "card_funding": "credit",
                  "billing_country": "billing_country",
                  "shipping_country": "shipping_country"
                },
                "device": {
                  "valid": true,
                  "automation": true,
                  "timezone": "timezone",
                  "language": "language",
                  "platform": "platform",
                  "screen": "screen",
                  "touch": true
                }
              },
              "user": {
                "id": "id",
                "email": "email"
              },
              "ip": "ip",
              "degraded": [
                "email_dns",
                "email_dns"
              ],
              "outcome": "legitimate",
              "review_status": "open",
              "created_at": "2024-01-15T09:30:00.000Z"
            }
            """;

        Server
            .Given(
                WireMock
                    .RequestBuilders.Request.Create()
                    .WithPath("/v1/risk/assessments")
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

        var response = await Client.Risk.AssessAsync(
            new CreateRiskAssessmentRequest
            {
                Event = RiskEvent.Signup,
                EventName = null,
                User = null,
                Ip = null,
                UserAgent = null,
                Captcha = null,
                Checkout = null,
                Device = null,
                Content = null,
            }
        );
        JsonAssert.AreEqual(response, mockResponse);
    }

    [NUnit.Framework.Test]
    public async Task MockServerTest_2()
    {
        const string requestJson = """
            {
              "event": "signup",
              "user": {
                "email": "ada@gmail.con"
              },
              "ip": "203.0.113.7",
              "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 15_0) AppleWebKit/605.1.15"
            }
            """;

        const string mockResponse = """
            {
              "object": "risk_assessment",
              "id": "rsk_01k7c8m4q2f3e9v6t5r1n0p8yz",
              "event": "signup",
              "event_name": null,
              "decision": "review",
              "score": 0.62,
              "reasons": [
                {
                  "code": "email.typo",
                  "message": "The domain looks like a typo of gmail.com.",
                  "value": 1.1,
                  "threshold": 1.1,
                  "window": "1h",
                  "suggestion": "gmail.com",
                  "provider": "provider",
                  "previous_user": "previous_user",
                  "previous_assessment": "previous_assessment",
                  "entry": "entry",
                  "rule": "rule",
                  "name": "name",
                  "type": "email"
                },
                {
                  "code": "velocity.signups_per_ip_1h",
                  "message": "7 sign-ups from this IP address in the last hour.",
                  "value": 7,
                  "threshold": 5,
                  "window": "1h",
                  "suggestion": "suggestion",
                  "provider": "provider",
                  "previous_user": "previous_user",
                  "previous_assessment": "previous_assessment",
                  "entry": "entry",
                  "rule": "rule",
                  "name": "name",
                  "type": "email"
                }
              ],
              "signals": {
                "email": {
                  "domain": "gmail.con",
                  "valid": true,
                  "disposable": false,
                  "deliverability": "deliverable",
                  "role_account": false,
                  "free_provider": false,
                  "suggestion": "gmail.com",
                  "domain_age_days": 9
                },
                "ip": {
                  "version": 4,
                  "private": false,
                  "tor": false,
                  "hosting": false,
                  "hosting_provider": null,
                  "hosting_kind": null,
                  "asn": 64500,
                  "as_name": "Example Broadband",
                  "country": "GB",
                  "privacy": null
                },
                "velocity": {
                  "ip_1h": 7,
                  "ip_24h": 9,
                  "subnet_1h": 7,
                  "mailbox_24h": 1
                },
                "captcha": {
                  "provided": true,
                  "passed": true
                },
                "login": null,
                "content": null,
                "checkout": null,
                "device": null
              },
              "user": {
                "id": null,
                "email": "ada@gmail.con"
              },
              "ip": "203.0.113.7",
              "degraded": [
                "email_dns"
              ],
              "outcome": null,
              "review_status": "open",
              "created_at": "2026-01-15T09:30:00.000Z"
            }
            """;

        Server
            .Given(
                WireMock
                    .RequestBuilders.Request.Create()
                    .WithPath("/v1/risk/assessments")
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

        var response = await Client.Risk.AssessAsync(
            new CreateRiskAssessmentRequest
            {
                IdempotencyKey = "welcome-user-123",
                Event = RiskEvent.Signup,
                User = new CreateRiskAssessmentRequestUser { Email = "ada@gmail.con" },
                Ip = "203.0.113.7",
                UserAgent = "Mozilla/5.0 (Macintosh; Intel Mac OS X 15_0) AppleWebKit/605.1.15",
            }
        );
        JsonAssert.AreEqual(response, mockResponse);
    }
}
