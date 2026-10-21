using Coss.Email;
using Coss.Test.Unit.MockServer;
using Coss.Test.Utils;
using NUnit.Framework;

namespace Coss.Test.Unit.MockServer.Email.Templates;

[TestFixture]
[Parallelizable(ParallelScope.Self)]
public class UpdateTest : BaseMockServerTest
{
    [NUnit.Framework.Test]
    public async Task MockServerTest_1()
    {
        const string requestJson = """
            {
              "alias": null,
              "description": null
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
                    .WithPath("/v1/email_templates/id")
                    .WithHeader("Content-Type", "application/json")
                    .UsingPatch()
                    .WithBodyAsJson(requestJson)
            )
            .RespondWith(
                WireMock
                    .ResponseBuilders.Response.Create()
                    .WithStatusCode(200)
                    .WithBody(mockResponse)
            );

        var response = await Client.Email.Templates.UpdateAsync(
            new UpdateEmailTemplateRequest
            {
                Id = "id",
                Name = null,
                Alias = null,
                Description = null,
            }
        );
        JsonAssert.AreEqual(response, mockResponse);
    }

    [NUnit.Framework.Test]
    public async Task MockServerTest_2()
    {
        const string requestJson = """
            {
              "name": "Welcome (new users)"
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
                    .WithPath("/v1/email_templates/etpl_01k7c8m4q2f3e9v6t5r1n0p8yz")
                    .WithHeader("Content-Type", "application/json")
                    .UsingPatch()
                    .WithBodyAsJson(requestJson)
            )
            .RespondWith(
                WireMock
                    .ResponseBuilders.Response.Create()
                    .WithStatusCode(200)
                    .WithBody(mockResponse)
            );

        var response = await Client.Email.Templates.UpdateAsync(
            new UpdateEmailTemplateRequest
            {
                Id = "etpl_01k7c8m4q2f3e9v6t5r1n0p8yz",
                Name = "Welcome (new users)",
            }
        );
        JsonAssert.AreEqual(response, mockResponse);
    }
}
