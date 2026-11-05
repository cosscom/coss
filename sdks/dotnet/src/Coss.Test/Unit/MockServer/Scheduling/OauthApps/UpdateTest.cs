using Coss.Scheduling;
using Coss.Test.Unit.MockServer;
using Coss.Test.Utils;
using NUnit.Framework;

namespace Coss.Test.Unit.MockServer.Scheduling.OauthApps;

[TestFixture]
[Parallelizable(ParallelScope.Self)]
public class UpdateTest : BaseMockServerTest
{
    [NUnit.Framework.Test]
    public async Task MockServerTest_1()
    {
        const string requestJson = """
            {
              "tenant_id": null,
              "webhook_secret": null,
              "redirect_uri": null,
              "completion_url": null,
              "secret_expires_at": null
            }
            """;

        const string mockResponse = """
            {
              "object": "scheduling.oauth_app",
              "id": "id",
              "provider": "google",
              "client_id": "client_id",
              "tenant_id": "tenant_id",
              "redirect_uri": "redirect_uri",
              "coss_callback_url": "coss_callback_url",
              "completion_url": "completion_url",
              "zoom_event_url": "zoom_event_url",
              "scopes": [
                "scopes",
                "scopes"
              ],
              "status": "active",
              "last_error_code": "last_error_code",
              "last_error_at": "last_error_at",
              "secret_expires_at": "secret_expires_at",
              "verified_at": "verified_at",
              "connections": 1000000,
              "created_at": "created_at",
              "updated_at": "updated_at"
            }
            """;

        Server
            .Given(
                WireMock
                    .RequestBuilders.Request.Create()
                    .WithPath("/v1/scheduling/oauth_apps/id")
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

        var response = await Client.Scheduling.OauthApps.UpdateAsync(
            new UpdateOauthAppRequest
            {
                Id = "id",
                ClientSecret = null,
                TenantId = null,
                WebhookSecret = null,
                RedirectUri = null,
                CompletionUrl = null,
                SecretExpiresAt = null,
            }
        );
        JsonAssert.AreEqual(response, mockResponse);
    }

    [NUnit.Framework.Test]
    public async Task MockServerTest_2()
    {
        const string requestJson = """
            {
              "client_secret": "GOCSPX-abcdefghijklmnopqrstuvwxyz"
            }
            """;

        const string mockResponse = """
            {
              "object": "scheduling.oauth_app",
              "id": "calapp_01kd2m9a0b1c2d3e4f5g6h7j8m",
              "provider": "google",
              "client_id": "1234567890-abc.apps.googleusercontent.com",
              "tenant_id": null,
              "redirect_uri": "https://example.com/oauth/google",
              "coss_callback_url": "https://api.coss.com/scheduling/oauth/google/callback",
              "completion_url": "https://example.com/calendar-connected",
              "zoom_event_url": null,
              "scopes": [
                "https://www.googleapis.com/auth/calendar.events.freebusy"
              ],
              "status": "active",
              "last_error_code": null,
              "last_error_at": null,
              "secret_expires_at": null,
              "verified_at": "2027-01-01T10:00:00.000Z",
              "connections": 12,
              "created_at": "2027-01-01T10:00:00.000Z",
              "updated_at": "2027-01-01T10:00:00.000Z"
            }
            """;

        Server
            .Given(
                WireMock
                    .RequestBuilders.Request.Create()
                    .WithPath("/v1/scheduling/oauth_apps/calapp_01kd2m9a0b1c2d3e4f5g6h7j8m")
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

        var response = await Client.Scheduling.OauthApps.UpdateAsync(
            new UpdateOauthAppRequest
            {
                Id = "calapp_01kd2m9a0b1c2d3e4f5g6h7j8m",
                ClientSecret = "GOCSPX-abcdefghijklmnopqrstuvwxyz",
            }
        );
        JsonAssert.AreEqual(response, mockResponse);
    }
}
