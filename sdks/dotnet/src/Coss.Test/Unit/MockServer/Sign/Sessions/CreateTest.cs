using Coss.Sign;
using Coss.Test.Unit.MockServer;
using Coss.Test.Utils;
using NUnit.Framework;

namespace Coss.Test.Unit.MockServer.Sign.Sessions;

[TestFixture]
[Parallelizable(ParallelScope.Self)]
public class CreateTest : BaseMockServerTest
{
    [NUnit.Framework.Test]
    public async Task MockServerTest_1()
    {
        const string requestJson = """
            {}
            """;

        const string mockResponse = """
            {
              "object": "sign_session",
              "id": "id",
              "request_id": "request_id",
              "signer_id": "signer_id",
              "url": "url",
              "token": "token",
              "expires_at": "2024-01-15T09:30:00.000Z"
            }
            """;

        Server
            .Given(
                WireMock
                    .RequestBuilders.Request.Create()
                    .WithPath("/v1/sign/requests/id/signers/signer_id/sessions")
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

        var response = await Client.Sign.Sessions.CreateAsync(
            new CreateSignSessionRequest
            {
                Id = "id",
                SignerId = "signer_id",
                ExpiresIn = null,
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
              "object": "sign_session",
              "id": "sgs_01k7c8m4q2f3e9v6t5r1n0p8yz",
              "request_id": "sreq_01k7c8m4q2f3e9v6t5r1n0p8yz",
              "signer_id": "ssgn_01k7c8m4q2f3e9v6t5r1n0p8yz",
              "url": "https://sign.example/s/sgs_01k7c8m4q2f3e9v6t5r1n0p8yz#cosss_…",
              "token": "cosss_…",
              "expires_at": "2026-10-26T15:04:05.000Z"
            }
            """;

        Server
            .Given(
                WireMock
                    .RequestBuilders.Request.Create()
                    .WithPath(
                        "/v1/sign/requests/sreq_01k7c8m4q2f3e9v6t5r1n0p8yz/signers/ssgn_01k7c8m4q2f3e9v6t5r1n0p8yz/sessions"
                    )
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

        var response = await Client.Sign.Sessions.CreateAsync(
            new CreateSignSessionRequest
            {
                Id = "sreq_01k7c8m4q2f3e9v6t5r1n0p8yz",
                SignerId = "ssgn_01k7c8m4q2f3e9v6t5r1n0p8yz",
                ExpiresIn = 3600,
            }
        );
        JsonAssert.AreEqual(response, mockResponse);
    }
}
