using Coss;
using Coss.Test.Unit.MockServer;
using Coss.Test.Utils;
using NUnit.Framework;

namespace Coss.Test.Unit.MockServer.Forms;

[TestFixture]
[Parallelizable(ParallelScope.Self)]
public class RemoveTest : BaseMockServerTest
{
    [NUnit.Framework.Test]
    public async Task MockServerTest_1()
    {
        const string mockResponse = """
            {
              "object": "form",
              "id": "id",
              "deleted": true
            }
            """;

        Server
            .Given(WireMock.RequestBuilders.Request.Create().WithPath("/v1/forms/id").UsingDelete())
            .RespondWith(
                WireMock
                    .ResponseBuilders.Response.Create()
                    .WithStatusCode(200)
                    .WithBody(mockResponse)
            );

        var response = await Client.Forms.RemoveAsync(new RemoveFormsRequest { Id = "id" });
        JsonAssert.AreEqual(response, mockResponse);
    }

    [NUnit.Framework.Test]
    public async Task MockServerTest_2()
    {
        const string mockResponse = """
            {
              "object": "form",
              "id": "form_01kd2m8n3p4q5r6s7t8v9w0x1y",
              "deleted": true
            }
            """;

        Server
            .Given(
                WireMock
                    .RequestBuilders.Request.Create()
                    .WithPath("/v1/forms/form_01kd2m8n3p4q5r6s7t8v9w0x1y")
                    .UsingDelete()
            )
            .RespondWith(
                WireMock
                    .ResponseBuilders.Response.Create()
                    .WithStatusCode(200)
                    .WithBody(mockResponse)
            );

        var response = await Client.Forms.RemoveAsync(
            new RemoveFormsRequest { Id = "form_01kd2m8n3p4q5r6s7t8v9w0x1y" }
        );
        JsonAssert.AreEqual(response, mockResponse);
    }
}
