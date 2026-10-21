using Coss.Hooks;
using Coss.Test.Unit.MockServer;
using Coss.Test.Utils;
using NUnit.Framework;

namespace Coss.Test.Unit.MockServer.Hooks.Portal;

[TestFixture]
[Parallelizable(ParallelScope.Self)]
public class CreateSessionTest : BaseMockServerTest
{
    [NUnit.Framework.Test]
    public async Task MockServerTest_1()
    {
        const string requestJson = """
            {}
            """;

        const string mockResponse = """
            {
              "object": "hook_portal_session",
              "id": "id",
              "application_id": "application_id",
              "url": "url",
              "token": "token",
              "read_only": true,
              "expires_at": "2024-01-15T09:30:00.000Z"
            }
            """;

        Server
            .Given(
                WireMock
                    .RequestBuilders.Request.Create()
                    .WithPath("/v1/hooks/applications/application/portal_sessions")
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

        var response = await Client.Hooks.Portal.CreateSessionAsync(
            new CreateHookPortalSessionRequest
            {
                Application = "application",
                ExpiresIn = null,
                ReadOnly = null,
            }
        );
        JsonAssert.AreEqual(response, mockResponse);
    }

    [NUnit.Framework.Test]
    public async Task MockServerTest_2()
    {
        const string requestJson = """
            {
              "expires_in": 3600
            }
            """;

        const string mockResponse = """
            {
              "object": "hook_portal_session",
              "id": "hps_01k7c8m4q2f3e9v6t5r1n0p8yz",
              "application_id": "happ_01k7c8m4q2f3e9v6t5r1n0p8yz",
              "url": "https://portal.example/s/hps_01k7c8m4q2f3e9v6t5r1n0p8yz#cossp_…",
              "token": "cossp_…",
              "read_only": false,
              "expires_at": "2026-01-15T10:30:00.000Z"
            }
            """;

        Server
            .Given(
                WireMock
                    .RequestBuilders.Request.Create()
                    .WithPath("/v1/hooks/applications/customer_8812/portal_sessions")
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

        var response = await Client.Hooks.Portal.CreateSessionAsync(
            new CreateHookPortalSessionRequest { Application = "customer_8812", ExpiresIn = 3600 }
        );
        JsonAssert.AreEqual(response, mockResponse);
    }
}
