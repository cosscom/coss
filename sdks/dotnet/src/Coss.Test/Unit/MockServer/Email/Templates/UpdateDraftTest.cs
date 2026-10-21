using Coss;
using Coss.Email;
using Coss.Test.Unit.MockServer;
using Coss.Test.Utils;
using NUnit.Framework;

namespace Coss.Test.Unit.MockServer.Email.Templates;

[TestFixture]
[Parallelizable(ParallelScope.Self)]
public class UpdateDraftTest : BaseMockServerTest
{
    [NUnit.Framework.Test]
    public async Task MockServerTest_1()
    {
        const string requestJson = """
            {}
            """;

        const string mockResponse = """
            {
              "object": "email_template_version",
              "template_id": "template_id",
              "version": 1000000,
              "revision": 1000000,
              "default_locale": "default_locale",
              "variables": [
                {
                  "name": "name",
                  "type": "string",
                  "required": true,
                  "default": "default",
                  "description": "description",
                  "fields": [
                    {
                      "name": "name",
                      "type": "string",
                      "required": true
                    },
                    {
                      "name": "name",
                      "type": "string",
                      "required": true
                    }
                  ]
                },
                {
                  "name": "name",
                  "type": "string",
                  "required": true,
                  "default": "default",
                  "description": "description",
                  "fields": [
                    {
                      "name": "name",
                      "type": "string",
                      "required": true
                    },
                    {
                      "name": "name",
                      "type": "string",
                      "required": true
                    }
                  ]
                }
              ],
              "sample_variables": {
                "sample_variables": {
                  "key": "value"
                }
              },
              "contents": [
                {
                  "locale": "locale",
                  "subject": "subject",
                  "html": "html",
                  "text": "text"
                },
                {
                  "locale": "locale",
                  "subject": "subject",
                  "html": "html",
                  "text": "text"
                }
              ],
              "problems": [
                {
                  "locale": "locale",
                  "field": "subject",
                  "message": "message",
                  "line": 1000000,
                  "column": 1000000
                },
                {
                  "locale": "locale",
                  "field": "subject",
                  "message": "message",
                  "line": 1000000,
                  "column": 1000000
                }
              ],
              "published_at": "2024-01-15T09:30:00.000Z",
              "created_at": "2024-01-15T09:30:00.000Z",
              "updated_at": "2024-01-15T09:30:00.000Z"
            }
            """;

        Server
            .Given(
                WireMock
                    .RequestBuilders.Request.Create()
                    .WithPath("/v1/email_templates/id/draft")
                    .WithHeader("Content-Type", "application/json")
                    .UsingPut()
                    .WithBodyAsJson(requestJson)
            )
            .RespondWith(
                WireMock
                    .ResponseBuilders.Response.Create()
                    .WithStatusCode(200)
                    .WithBody(mockResponse)
            );

        var response = await Client.Email.Templates.UpdateDraftAsync(
            new UpdateEmailTemplateDraftRequest
            {
                Id = "id",
                Revision = null,
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
              "revision": 3,
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
              "object": "email_template_version",
              "template_id": "etpl_01k7c8m4q2f3e9v6t5r1n0p8yz",
              "version": 2,
              "revision": 3,
              "default_locale": "en",
              "variables": [
                {
                  "name": "first_name",
                  "type": "string",
                  "required": true,
                  "default": "default",
                  "description": "description",
                  "fields": [
                    {
                      "name": "name",
                      "type": "string",
                      "required": true
                    }
                  ]
                }
              ],
              "sample_variables": {
                "first_name": "Ada"
              },
              "contents": [
                {
                  "locale": "en",
                  "subject": "Welcome, {{first_name}}",
                  "html": "<p>Hi {{first_name}}, thanks for signing up!</p>",
                  "text": null
                }
              ],
              "problems": [
                {
                  "locale": "locale",
                  "field": "subject",
                  "message": "message",
                  "line": 1000000,
                  "column": 1000000
                }
              ],
              "published_at": "2026-10-10T12:00:00.000Z",
              "created_at": "2026-10-10T12:00:00.000Z",
              "updated_at": "2026-10-10T12:00:00.000Z"
            }
            """;

        Server
            .Given(
                WireMock
                    .RequestBuilders.Request.Create()
                    .WithPath("/v1/email_templates/etpl_01k7c8m4q2f3e9v6t5r1n0p8yz/draft")
                    .WithHeader("Content-Type", "application/json")
                    .UsingPut()
                    .WithBodyAsJson(requestJson)
            )
            .RespondWith(
                WireMock
                    .ResponseBuilders.Response.Create()
                    .WithStatusCode(200)
                    .WithBody(mockResponse)
            );

        var response = await Client.Email.Templates.UpdateDraftAsync(
            new UpdateEmailTemplateDraftRequest
            {
                Id = "etpl_01k7c8m4q2f3e9v6t5r1n0p8yz",
                Revision = 3,
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
