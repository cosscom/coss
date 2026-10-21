using Coss;
using Coss.Email;
using Coss.Test.Unit.MockServer;
using Coss.Test.Utils;
using NUnit.Framework;

namespace Coss.Test.Unit.MockServer.Email.Templates;

[TestFixture]
[Parallelizable(ParallelScope.Self)]
public class CreateTest : BaseMockServerTest
{
    [NUnit.Framework.Test]
    public async Task MockServerTest_1()
    {
        const string requestJson = """
            {
              "name": "x"
            }
            """;

        const string mockResponse = """
            {
              "object": "email_template",
              "id": "id",
              "alias": "alias",
              "name": "name",
              "description": "description",
              "published_version": 1000000,
              "published_at": "2024-01-15T09:30:00.000Z",
              "has_unpublished_changes": true,
              "created_at": "2024-01-15T09:30:00.000Z",
              "updated_at": "2024-01-15T09:30:00.000Z"
            }
            """;

        Server
            .Given(
                WireMock
                    .RequestBuilders.Request.Create()
                    .WithPath("/v1/email_templates")
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

        var response = await Client.Email.Templates.CreateAsync(
            new CreateEmailTemplateRequest
            {
                Name = "x",
                Alias = null,
                Description = null,
                DefaultLocale = null,
                Variables = null,
                SampleVariables = null,
                Contents = null,
            }
        );
        JsonAssert.AreEqual(response, mockResponse);
    }

    [NUnit.Framework.Test]
    public async Task MockServerTest_2()
    {
        const string requestJson = """
            {
              "name": "Welcome",
              "alias": "welcome",
              "default_locale": "en",
              "variables": [
                {
                  "name": "first_name",
                  "type": "string",
                  "required": true
                }
              ],
              "sample_variables": {
                "first_name": "Ada"
              },
              "contents": [
                {
                  "locale": "en",
                  "subject": "Welcome, {{first_name}}",
                  "html": "<p>Hi {{first_name}}, thanks for signing up!</p>"
                },
                {
                  "locale": "de",
                  "subject": "Willkommen, {{first_name}}",
                  "html": "<p>Hallo {{first_name}}, danke für deine Anmeldung!</p>"
                }
              ]
            }
            """;

        const string mockResponse = """
            {
              "object": "email_template",
              "id": "etpl_01k7c8m4q2f3e9v6t5r1n0p8yz",
              "alias": "welcome",
              "name": "Welcome",
              "description": "Sent after sign-up.",
              "published_version": 2,
              "published_at": "2026-10-10T12:00:00.000Z",
              "has_unpublished_changes": false,
              "created_at": "2026-10-01T09:00:00.000Z",
              "updated_at": "2026-10-10T12:00:00.000Z"
            }
            """;

        Server
            .Given(
                WireMock
                    .RequestBuilders.Request.Create()
                    .WithPath("/v1/email_templates")
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

        var response = await Client.Email.Templates.CreateAsync(
            new CreateEmailTemplateRequest
            {
                Name = "Welcome",
                Alias = "welcome",
                DefaultLocale = "en",
                Variables = new List<TemplateVariableInput>()
                {
                    new TemplateVariableInput
                    {
                        Name = "first_name",
                        Type = TemplateVariableInputType.String,
                        Required = true,
                    },
                },
                SampleVariables = new Dictionary<string, object?>() { { "first_name", "Ada" } },
                Contents = new List<TemplateContentInput>()
                {
                    new TemplateContentInput
                    {
                        Locale = "en",
                        Subject = "Welcome, {{first_name}}",
                        Html = "<p>Hi {{first_name}}, thanks for signing up!</p>",
                    },
                    new TemplateContentInput
                    {
                        Locale = "de",
                        Subject = "Willkommen, {{first_name}}",
                        Html = "<p>Hallo {{first_name}}, danke für deine Anmeldung!</p>",
                    },
                },
            }
        );
        JsonAssert.AreEqual(response, mockResponse);
    }
}
