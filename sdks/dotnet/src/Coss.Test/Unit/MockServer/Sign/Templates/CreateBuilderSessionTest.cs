using Coss.Sign;
using Coss.Test.Unit.MockServer;
using Coss.Test.Utils;
using NUnit.Framework;

namespace Coss.Test.Unit.MockServer.Sign.Templates;

[TestFixture]
[Parallelizable(ParallelScope.Self)]
public class CreateBuilderSessionTest : BaseMockServerTest
{
    [NUnit.Framework.Test]
    public async Task MockServerTest_1()
    {
        const string requestJson = """
            {}
            """;

        const string mockResponse = """
            {
              "object": "sign_builder_session",
              "id": "id",
              "template_id": "template_id",
              "url": "url",
              "token": "token",
              "expires_at": "2024-01-15T09:30:00.000Z"
            }
            """;

        Server
            .Given(
                WireMock
                    .RequestBuilders.Request.Create()
                    .WithPath("/v1/sign/templates/id/builder_sessions")
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

        var response = await Client.Sign.Templates.CreateBuilderSessionAsync(
            new CreateSignBuilderSessionRequest { Id = "id", ExpiresIn = null }
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
              "object": "sign_builder_session",
              "id": "sbs_01k7c8m4q2f3e9v6t5r1n0p8yz",
              "template_id": "stpl_01k7c8m4q2f3e9v6t5r1n0p8yz",
              "url": "https://sign.example/b/sbs_01k7c8m4q2f3e9v6t5r1n0p8yz#cossb_…",
              "token": "cossb_…",
              "expires_at": "2026-10-26T15:04:05.000Z"
            }
            """;

        Server
            .Given(
                WireMock
                    .RequestBuilders.Request.Create()
                    .WithPath("/v1/sign/templates/stpl_01k7c8m4q2f3e9v6t5r1n0p8yz/builder_sessions")
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

        var response = await Client.Sign.Templates.CreateBuilderSessionAsync(
            new CreateSignBuilderSessionRequest
            {
                Id = "stpl_01k7c8m4q2f3e9v6t5r1n0p8yz",
                ExpiresIn = 3600,
            }
        );
        JsonAssert.AreEqual(response, mockResponse);
    }
}
