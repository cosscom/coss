using Coss.Hooks;
using Coss.Test.Unit.MockServer;
using Coss.Test.Utils;
using NUnit.Framework;

namespace Coss.Test.Unit.MockServer.Hooks.Endpoints;

[TestFixture]
[Parallelizable(ParallelScope.Self)]
public class GetSecretTest : BaseMockServerTest
{
    [NUnit.Framework.Test]
    public async Task MockServerTest_1()
    {
        const string mockResponse = """
            {
              "object": "hook_endpoint_secret",
              "secret": "secret"
            }
            """;

        Server
            .Given(
                WireMock
                    .RequestBuilders.Request.Create()
                    .WithPath("/v1/hooks/applications/application/endpoints/endpoint_id/secret")
                    .UsingGet()
            )
            .RespondWith(
                WireMock
                    .ResponseBuilders.Response.Create()
                    .WithStatusCode(200)
                    .WithBody(mockResponse)
            );

        var response = await Client.Hooks.Endpoints.GetSecretAsync(
            new GetSecretEndpointsRequest
            {
                Application = "application",
                EndpointId = "endpoint_id",
            }
        );
        JsonAssert.AreEqual(response, mockResponse);
    }

    [NUnit.Framework.Test]
    public async Task MockServerTest_2()
    {
        const string mockResponse = """
            {
              "object": "hook_endpoint_secret",
              "secret": "whsec_6Jk…"
            }
            """;

        Server
            .Given(
                WireMock
                    .RequestBuilders.Request.Create()
                    .WithPath(
                        "/v1/hooks/applications/customer_8812/endpoints/hep_01k7c8m4q2f3e9v6t5r1n0p8yz/secret"
                    )
                    .UsingGet()
            )
            .RespondWith(
                WireMock
                    .ResponseBuilders.Response.Create()
                    .WithStatusCode(200)
                    .WithBody(mockResponse)
            );

        var response = await Client.Hooks.Endpoints.GetSecretAsync(
            new GetSecretEndpointsRequest
            {
                Application = "customer_8812",
                EndpointId = "hep_01k7c8m4q2f3e9v6t5r1n0p8yz",
            }
        );
        JsonAssert.AreEqual(response, mockResponse);
    }
}
