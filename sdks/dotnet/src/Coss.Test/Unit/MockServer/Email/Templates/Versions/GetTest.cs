using Coss.Email.Templates;
using Coss.Test.Unit.MockServer;
using Coss.Test.Utils;
using NUnit.Framework;

namespace Coss.Test.Unit.MockServer.Email.Templates.Versions;

[TestFixture]
[Parallelizable(ParallelScope.Self)]
public class GetTest : BaseMockServerTest
{
    [NUnit.Framework.Test]
    public async Task MockServerTest_1()
    {
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
                    .WithPath("/v1/email_templates/id/versions/1000000")
                    .UsingGet()
            )
            .RespondWith(
                WireMock
                    .ResponseBuilders.Response.Create()
                    .WithStatusCode(200)
                    .WithBody(mockResponse)
            );

        var response = await Client.Email.Templates.Versions.GetAsync(
            new GetVersionsRequest { Id = "id", Version = 1000000 }
        );
        JsonAssert.AreEqual(response, mockResponse);
    }

    [NUnit.Framework.Test]
    public async Task MockServerTest_2()
    {
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
                    .WithPath("/v1/email_templates/etpl_01k7c8m4q2f3e9v6t5r1n0p8yz/versions/1")
                    .UsingGet()
            )
            .RespondWith(
                WireMock
                    .ResponseBuilders.Response.Create()
                    .WithStatusCode(200)
                    .WithBody(mockResponse)
            );

        var response = await Client.Email.Templates.Versions.GetAsync(
            new GetVersionsRequest { Id = "etpl_01k7c8m4q2f3e9v6t5r1n0p8yz", Version = 1 }
        );
        JsonAssert.AreEqual(response, mockResponse);
    }
}
