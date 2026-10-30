using Coss;
using Coss.Test.Unit.MockServer;
using Coss.Test.Utils;
using NUnit.Framework;

namespace Coss.Test.Unit.MockServer.Forms;

[TestFixture]
[Parallelizable(ParallelScope.Self)]
public class CreateTest : BaseMockServerTest
{
    [NUnit.Framework.Test]
    public async Task MockServerTest_1()
    {
        const string requestJson = """
            {
              "name": "x",
              "fields": null,
              "redirect_url": null
            }
            """;

        const string mockResponse = """
            {
              "object": "form",
              "id": "id",
              "name": "name",
              "enabled": true,
              "endpoint": "endpoint",
              "hosted_url": "hosted_url",
              "fields": [
                {
                  "name": "name",
                  "type": "text",
                  "label": "label",
                  "required": true,
                  "placeholder": "placeholder",
                  "options": [
                    "options",
                    "options"
                  ],
                  "max_length": 1000000
                },
                {
                  "name": "name",
                  "type": "text",
                  "label": "label",
                  "required": true,
                  "placeholder": "placeholder",
                  "options": [
                    "options",
                    "options"
                  ],
                  "max_length": 1000000
                }
              ],
              "strict_fields": true,
              "allowed_origins": [
                "allowed_origins",
                "allowed_origins"
              ],
              "redirect_url": "redirect_url",
              "spam": {
                "honeypot_field": "honeypot_field",
                "captcha": "off",
                "captcha_site_key": "captcha_site_key",
                "content_threshold": 1.1,
                "on_review": "deliver"
              },
              "submitter": {
                "email_field": "email_field",
                "verify": true,
                "confirmation_from": "confirmation_from"
              },
              "notifications": {
                "recipients": [
                  "recipients",
                  "recipients"
                ],
                "from": "from"
              },
              "contacts": {
                "enabled": true,
                "audience_ids": [
                  "audience_ids",
                  "audience_ids"
                ],
                "topics": [
                  "topics",
                  "topics"
                ],
                "double_opt_in": true,
                "first_name_field": "first_name_field",
                "last_name_field": "last_name_field",
                "properties": {
                  "properties": "properties"
                }
              },
              "files": {
                "enabled": true,
                "max_files": 1000000,
                "max_file_bytes": 1000000,
                "allowed_types": [
                  "allowed_types",
                  "allowed_types"
                ]
              },
              "hosted": {
                "enabled": true,
                "title": "title",
                "description": "description",
                "submit_label": "submit_label",
                "success_message": "success_message",
                "published_at": "2024-01-15T09:30:00.000Z"
              },
              "disabled_by_admin": true,
              "sandbox": true,
              "created_at": "2024-01-15T09:30:00.000Z",
              "updated_at": "2024-01-15T09:30:00.000Z"
            }
            """;

        Server
            .Given(
                WireMock
                    .RequestBuilders.Request.Create()
                    .WithPath("/v1/forms")
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

        var response = await Client.Forms.CreateAsync(
            new CreateFormRequest
            {
                Name = "x",
                Enabled = null,
                Fields = null,
                StrictFields = null,
                AllowedOrigins = null,
                RedirectUrl = null,
                Spam = null,
                Submitter = null,
                Notifications = null,
                Contacts = null,
                Files = null,
                Hosted = null,
            }
        );
        JsonAssert.AreEqual(response, mockResponse);
    }

    [NUnit.Framework.Test]
    public async Task MockServerTest_2()
    {
        const string requestJson = """
            {
              "name": "Contact us",
              "allowed_origins": [
                "https://www.example.com"
              ],
              "notifications": {
                "recipients": [
                  "support@example.com"
                ]
              }
            }
            """;

        const string mockResponse = """
            {
              "object": "form",
              "id": "form_01kd2m8n3p4q5r6s7t8v9w0x1y",
              "name": "Contact us",
              "enabled": true,
              "endpoint": "https://cossforms.com/f/form_01kd2m8n3p4q5r6s7t8v9w0x1y",
              "hosted_url": null,
              "fields": null,
              "strict_fields": false,
              "allowed_origins": [
                "https://www.example.com"
              ],
              "redirect_url": null,
              "spam": {
                "honeypot_field": "_gotcha",
                "captcha": "off",
                "captcha_site_key": null,
                "content_threshold": 0.9,
                "on_review": "hold"
              },
              "submitter": {
                "email_field": "email",
                "verify": false,
                "confirmation_from": null
              },
              "notifications": {
                "recipients": [
                  "support@example.com"
                ],
                "from": null
              },
              "contacts": {
                "enabled": false,
                "audience_ids": [
                  "audience_ids"
                ],
                "topics": [
                  "topics"
                ],
                "double_opt_in": null,
                "first_name_field": null,
                "last_name_field": null,
                "properties": {
                  "key": "value"
                }
              },
              "files": {
                "enabled": false,
                "max_files": 3,
                "max_file_bytes": 10485760,
                "allowed_types": [
                  "allowed_types"
                ]
              },
              "hosted": {
                "enabled": false,
                "title": null,
                "description": null,
                "submit_label": null,
                "success_message": null,
                "published_at": null
              },
              "disabled_by_admin": false,
              "sandbox": false,
              "created_at": "2026-10-29T10:00:00.000Z",
              "updated_at": "2026-10-29T10:00:00.000Z"
            }
            """;

        Server
            .Given(
                WireMock
                    .RequestBuilders.Request.Create()
                    .WithPath("/v1/forms")
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

        var response = await Client.Forms.CreateAsync(
            new CreateFormRequest
            {
                Name = "Contact us",
                AllowedOrigins = new List<string>() { "https://www.example.com" },
                Notifications = new CreateFormRequestNotifications
                {
                    Recipients = new List<string>() { "support@example.com" },
                },
            }
        );
        JsonAssert.AreEqual(response, mockResponse);
    }
}
