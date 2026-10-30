using Coss.Sign;
using Coss.Test.Unit.MockServer;
using Coss.Test.Utils;
using NUnit.Framework;

namespace Coss.Test.Unit.MockServer.Sign.Settings;

[TestFixture]
[Parallelizable(ParallelScope.Self)]
public class UpdateTest : BaseMockServerTest
{
    [NUnit.Framework.Test]
    public async Task MockServerTest_1()
    {
        const string requestJson = """
            {
              "display_name": null,
              "accent_color": null,
              "disclosure": null,
              "email_from": null,
              "reminder_interval_days": null
            }
            """;

        const string mockResponse = """
            {
              "object": "sign_settings",
              "allowed_origins": [
                "allowed_origins",
                "allowed_origins"
              ],
              "display_name": "display_name",
              "accent_color": "accent_color",
              "theme": "system",
              "disclosure": "disclosure",
              "email_from": "email_from",
              "reminder_interval_days": 1000000
            }
            """;

        Server
            .Given(
                WireMock
                    .RequestBuilders.Request.Create()
                    .WithPath("/v1/sign/settings")
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

        var response = await Client.Sign.Settings.UpdateAsync(
            new UpdateSignSettingsRequest
            {
                AllowedOrigins = null,
                DisplayName = null,
                AccentColor = null,
                Theme = null,
                Disclosure = null,
                EmailFrom = null,
                ReminderIntervalDays = null,
            }
        );
        JsonAssert.AreEqual(response, mockResponse);
    }

    [NUnit.Framework.Test]
    public async Task MockServerTest_2()
    {
        const string requestJson = """
            {
              "allowed_origins": [
                "https://app.example.com"
              ],
              "display_name": "Acme"
            }
            """;

        const string mockResponse = """
            {
              "object": "sign_settings",
              "allowed_origins": [
                "https://app.example.com"
              ],
              "display_name": "Acme",
              "accent_color": "#2563eb",
              "theme": "system",
              "disclosure": null,
              "email_from": "contracts@acme.com",
              "reminder_interval_days": 3
            }
            """;

        Server
            .Given(
                WireMock
                    .RequestBuilders.Request.Create()
                    .WithPath("/v1/sign/settings")
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

        var response = await Client.Sign.Settings.UpdateAsync(
            new UpdateSignSettingsRequest
            {
                AllowedOrigins = new List<string>() { "https://app.example.com" },
                DisplayName = "Acme",
            }
        );
        JsonAssert.AreEqual(response, mockResponse);
    }
}
