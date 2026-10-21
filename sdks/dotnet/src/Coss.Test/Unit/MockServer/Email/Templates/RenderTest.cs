using Coss.Email;
using Coss.Test.Unit.MockServer;
using Coss.Test.Utils;
using NUnit.Framework;

namespace Coss.Test.Unit.MockServer.Email.Templates;

[TestFixture]
[Parallelizable(ParallelScope.Self)]
public class RenderTest : BaseMockServerTest
{
    [NUnit.Framework.Test]
    public async Task MockServerTest_1()
    {
        const string requestJson = """
            {}
            """;

        const string mockResponse = """
            {
              "object": "email_template_render",
              "template_id": "template_id",
              "version": 1000000,
              "locale": "locale",
              "subject": "subject",
              "html": "html",
              "text": "text"
            }
            """;

        Server
            .Given(
                WireMock
                    .RequestBuilders.Request.Create()
                    .WithPath("/v1/email_templates/id/render")
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

        var response = await Client.Email.Templates.RenderAsync(
            new RenderEmailTemplateRequest
            {
                Id = "id",
                Version = null,
                Locale = null,
                Variables = null,
            }
        );
        JsonAssert.AreEqual(response, mockResponse);
    }

    [NUnit.Framework.Test]
    public async Task MockServerTest_2()
    {
        const string requestJson = """
            {
              "locale": "en",
              "variables": {
                "first_name": "Ada"
              }
            }
            """;

        const string mockResponse = """
            {
              "object": "email_template_render",
              "template_id": "etpl_01k7c8m4q2f3e9v6t5r1n0p8yz",
              "locale": "en",
              "subject": "Welcome, Ada",
              "html": "<p>Hi Ada, thanks for signing up!</p>"
            }
            """;

        Server
            .Given(
                WireMock
                    .RequestBuilders.Request.Create()
                    .WithPath("/v1/email_templates/etpl_01k7c8m4q2f3e9v6t5r1n0p8yz/render")
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

        var response = await Client.Email.Templates.RenderAsync(
            new RenderEmailTemplateRequest
            {
                Id = "etpl_01k7c8m4q2f3e9v6t5r1n0p8yz",
                Locale = "en",
                Variables = new Dictionary<string, object?>() { { "first_name", "Ada" } },
            }
        );
        JsonAssert.AreEqual(response, mockResponse);
    }
}
