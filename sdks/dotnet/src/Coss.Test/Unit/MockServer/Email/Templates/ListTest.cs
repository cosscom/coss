using Coss.Test.Unit.MockServer;
using Coss.Test.Utils;
using NUnit.Framework;

namespace Coss.Test.Unit.MockServer.Email.Templates;

[TestFixture]
[Parallelizable(ParallelScope.Self)]
public class ListTest : BaseMockServerTest
{
    [NUnit.Framework.Test]
    public async Task MockServerTest_1()
    {
        const string mockResponse = """
            {
              "object": "list",
              "data": [
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
                },
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
              ],
              "has_more": true
            }
            """;

        Server
            .Given(
                WireMock.RequestBuilders.Request.Create().WithPath("/v1/email_templates").UsingGet()
            )
            .RespondWith(
                WireMock
                    .ResponseBuilders.Response.Create()
                    .WithStatusCode(200)
                    .WithBody(mockResponse)
            );

        var response = await Client.Email.Templates.ListAsync(
            new Coss.Email.ListTemplatesRequest()
        );
        JsonAssert.AreEqual(response, mockResponse);
    }

    [NUnit.Framework.Test]
    public async Task MockServerTest_2()
    {
        const string mockResponse = """
            {
              "object": "list",
              "data": [
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
              ],
              "has_more": false
            }
            """;

        Server
            .Given(
                WireMock.RequestBuilders.Request.Create().WithPath("/v1/email_templates").UsingGet()
            )
            .RespondWith(
                WireMock
                    .ResponseBuilders.Response.Create()
                    .WithStatusCode(200)
                    .WithBody(mockResponse)
            );

        var response = await Client.Email.Templates.ListAsync(
            new Coss.Email.ListTemplatesRequest()
        );
        JsonAssert.AreEqual(response, mockResponse);
    }
}
