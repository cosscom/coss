using Coss.Test.Unit.MockServer;
using Coss.Test.Utils;
using NUnit.Framework;

namespace Coss.Test.Unit.MockServer.Risk.Settings;

[TestFixture]
[Parallelizable(ParallelScope.Self)]
public class GetTest : BaseMockServerTest
{
    [NUnit.Framework.Test]
    public async Task MockServerTest_1()
    {
        const string mockResponse = """
            {
              "object": "risk_settings",
              "review_threshold": 1.1,
              "block_threshold": 1.1,
              "disabled_reasons": [
                "email.invalid",
                "email.invalid"
              ],
              "captcha": {
                "provider": "turnstile",
                "required": true
              },
              "content_thresholds": {
                "spam": 1.1,
                "phishing": 1.1,
                "malware": 1.1,
                "fraud": 1.1
              },
              "reason_weights": {
                "email.invalid": 1.1,
                "email.disposable": 1.1,
                "email.undeliverable": 1.1,
                "email.role_account": 1.1,
                "email.typo": 1.1,
                "email.domain_new": 1.1,
                "ip.tor": 1.1,
                "ip.vpn_network": 1.1,
                "ip.hosting_provider": 1.1,
                "ip.vpn": 1.1,
                "ip.proxy": 1.1,
                "ip.relay": 1.1,
                "ip.private": 1.1,
                "velocity.signups_per_ip_1h": 1.1,
                "velocity.signups_per_ip_24h": 1.1,
                "velocity.signups_per_subnet_1h": 1.1,
                "velocity.signups_per_email_domain_1h": 1.1,
                "velocity.signups_per_mailbox_24h": 1.1,
                "velocity.signups_per_device_24h": 1.1,
                "velocity.checkouts_per_ip_1h": 1.1,
                "velocity.checkouts_per_user_1h": 1.1,
                "velocity.checkouts_per_card_24h": 1.1,
                "velocity.logins_per_ip_1h": 1.1,
                "velocity.logins_per_user_1h": 1.1,
                "velocity.events_per_ip_1h": 1.1,
                "velocity.events_per_user_1h": 1.1,
                "duplicate.canonical_mailbox": 1.1,
                "duplicate.device": 1.1,
                "history.fraud_mailbox": 1.1,
                "history.fraud_user": 1.1,
                "history.fraud_ip": 1.1,
                "history.fraud_subnet": 1.1,
                "history.fraud_card": 1.1,
                "history.fraud_device": 1.1,
                "checkout.card_country_mismatch": 1.1,
                "checkout.billing_country_mismatch": 1.1,
                "checkout.prepaid_card": 1.1,
                "device.automation": 1.1,
                "device.invalid": 1.1,
                "login.new_country": 1.1,
                "login.new_network": 1.1,
                "captcha.failed": 1.1,
                "captcha.missing": 1.1,
                "content.spam": 1.1,
                "content.phishing": 1.1,
                "content.malware": 1.1,
                "content.fraud": 1.1
              },
              "updated_at": "2024-01-15T09:30:00.000Z"
            }
            """;

        Server
            .Given(
                WireMock.RequestBuilders.Request.Create().WithPath("/v1/risk/settings").UsingGet()
            )
            .RespondWith(
                WireMock
                    .ResponseBuilders.Response.Create()
                    .WithStatusCode(200)
                    .WithBody(mockResponse)
            );

        var response = await Client.Risk.Settings.GetAsync();
        JsonAssert.AreEqual(response, mockResponse);
    }

    [NUnit.Framework.Test]
    public async Task MockServerTest_2()
    {
        const string mockResponse = """
            {
              "object": "risk_settings",
              "review_threshold": 0.5,
              "block_threshold": 0.85,
              "disabled_reasons": [
                "email.role_account"
              ],
              "captcha": {
                "provider": "turnstile",
                "required": true
              },
              "content_thresholds": {
                "phishing": 0.8,
                "malware": 0.8,
                "fraud": 0.9
              },
              "reason_weights": {
                "email.invalid": 1.1,
                "email.disposable": 1.1,
                "email.undeliverable": 1.1,
                "email.role_account": 1.1,
                "email.typo": 1.1,
                "email.domain_new": 1.1,
                "ip.tor": 1.1,
                "ip.vpn_network": 1.1,
                "ip.hosting_provider": 0.1,
                "ip.vpn": 1.1,
                "ip.proxy": 1.1,
                "ip.relay": 1.1,
                "ip.private": 1.1,
                "velocity.signups_per_ip_1h": 1.1,
                "velocity.signups_per_ip_24h": 1.1,
                "velocity.signups_per_subnet_1h": 1.1,
                "velocity.signups_per_email_domain_1h": 1.1,
                "velocity.signups_per_mailbox_24h": 1.1,
                "velocity.signups_per_device_24h": 1.1,
                "velocity.checkouts_per_ip_1h": 1.1,
                "velocity.checkouts_per_user_1h": 1.1,
                "velocity.checkouts_per_card_24h": 1.1,
                "velocity.logins_per_ip_1h": 1.1,
                "velocity.logins_per_user_1h": 1.1,
                "velocity.events_per_ip_1h": 1.1,
                "velocity.events_per_user_1h": 1.1,
                "duplicate.canonical_mailbox": 1.1,
                "duplicate.device": 1.1,
                "history.fraud_mailbox": 1.1,
                "history.fraud_user": 1.1,
                "history.fraud_ip": 1.1,
                "history.fraud_subnet": 1.1,
                "history.fraud_card": 1.1,
                "history.fraud_device": 1.1,
                "checkout.card_country_mismatch": 1.1,
                "checkout.billing_country_mismatch": 1.1,
                "checkout.prepaid_card": 1.1,
                "device.automation": 1.1,
                "device.invalid": 1.1,
                "login.new_country": 1.1,
                "login.new_network": 1.1,
                "captcha.failed": 1.1,
                "captcha.missing": 1.1,
                "content.spam": 1.1,
                "content.phishing": 1.1,
                "content.malware": 1.1,
                "content.fraud": 1.1
              },
              "updated_at": "2026-01-15T09:30:00.000Z"
            }
            """;

        Server
            .Given(
                WireMock.RequestBuilders.Request.Create().WithPath("/v1/risk/settings").UsingGet()
            )
            .RespondWith(
                WireMock
                    .ResponseBuilders.Response.Create()
                    .WithStatusCode(200)
                    .WithBody(mockResponse)
            );

        var response = await Client.Risk.Settings.GetAsync();
        JsonAssert.AreEqual(response, mockResponse);
    }
}
