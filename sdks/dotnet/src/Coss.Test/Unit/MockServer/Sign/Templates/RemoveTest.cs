using Coss.Sign;
using Coss.Test.Unit.MockServer;
using Coss.Test.Utils;
using NUnit.Framework;

namespace Coss.Test.Unit.MockServer.Sign.Templates;

[TestFixture]
[Parallelizable(ParallelScope.Self)]
public class RemoveTest : BaseMockServerTest
{
    [NUnit.Framework.Test]
    public async Task MockServerTest_1()
    {
        const string mockResponse = """
            {
              "object": "sign_template",
              "id": "id",
              "deleted": true
            }
            """;

        Server
            .Given(
                WireMock
                    .RequestBuilders.Request.Create()
                    .WithPath("/v1/sign/templates/id")
                    .UsingDelete()
            )
            .RespondWith(
                WireMock
                    .ResponseBuilders.Response.Create()
                    .WithStatusCode(200)
                    .WithBody(mockResponse)
            );

        var response = await Client.Sign.Templates.RemoveAsync(
            new RemoveTemplatesRequest { Id = "id" }
        );
        JsonAssert.AreEqual(response, mockResponse);
    }

    [NUnit.Framework.Test]
    public async Task MockServerTest_2()
    {
        const string mockResponse = """
            {
              "object": "sign_template",
              "id": "stpl_01k7c8m4q2f3e9v6t5r1n0p8yz",
              "deleted": true
            }
            """;

        Server
            .Given(
                WireMock
                    .RequestBuilders.Request.Create()
                    .WithPath("/v1/sign/templates/stpl_01k7c8m4q2f3e9v6t5r1n0p8yz")
                    .UsingDelete()
            )
            .RespondWith(
                WireMock
                    .ResponseBuilders.Response.Create()
                    .WithStatusCode(200)
                    .WithBody(mockResponse)
            );

        var response = await Client.Sign.Templates.RemoveAsync(
            new RemoveTemplatesRequest { Id = "stpl_01k7c8m4q2f3e9v6t5r1n0p8yz" }
        );
        JsonAssert.AreEqual(response, mockResponse);
    }
}
