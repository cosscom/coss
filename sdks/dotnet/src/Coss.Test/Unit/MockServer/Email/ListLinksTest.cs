using Coss;
using Coss.Test.Unit.MockServer;
using Coss.Test.Utils;
using NUnit.Framework;

namespace Coss.Test.Unit.MockServer.Email;

[TestFixture]
[Parallelizable(ParallelScope.Self)]
public class ListLinksTest : BaseMockServerTest
{
    [NUnit.Framework.Test]
    public async Task MockServerTest_1()
    {
        const string mockResponse = """
            {
              "object": "list",
              "data": [
                {
                  "object": "email_link",
                  "id": "id",
                  "email_id": "email_id",
                  "position": 1000000,
                  "url": "url",
                  "click_count": 1000000,
                  "first_clicked_at": "2024-01-15T09:30:00.000Z",
                  "last_clicked_at": "2024-01-15T09:30:00.000Z"
                },
                {
                  "object": "email_link",
                  "id": "id",
                  "email_id": "email_id",
                  "position": 1000000,
                  "url": "url",
                  "click_count": 1000000,
                  "first_clicked_at": "2024-01-15T09:30:00.000Z",
                  "last_clicked_at": "2024-01-15T09:30:00.000Z"
                }
              ],
              "has_more": true
            }
            """;

        Server
            .Given(
                WireMock.RequestBuilders.Request.Create().WithPath("/v1/emails/id/links").UsingGet()
            )
            .RespondWith(
                WireMock
                    .ResponseBuilders.Response.Create()
                    .WithStatusCode(200)
                    .WithBody(mockResponse)
            );

        var response = await Client.Email.ListLinksAsync(new ListLinksEmailRequest { Id = "id" });
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
                  "object": "email_link",
                  "id": "lnk_01k7c8m4q2f3e9v6t5r1n0p8yz",
                  "email_id": "email_01k7c8m4q2f3e9v6t5r1n0p8yz",
                  "position": 0,
                  "url": "https://acme.com/start",
                  "click_count": 0
                }
              ],
              "has_more": false
            }
            """;

        Server
            .Given(
                WireMock
                    .RequestBuilders.Request.Create()
                    .WithPath("/v1/emails/email_01k7c8m4q2f3e9v6t5r1n0p8yz/links")
                    .UsingGet()
            )
            .RespondWith(
                WireMock
                    .ResponseBuilders.Response.Create()
                    .WithStatusCode(200)
                    .WithBody(mockResponse)
            );

        var response = await Client.Email.ListLinksAsync(
            new ListLinksEmailRequest { Id = "email_01k7c8m4q2f3e9v6t5r1n0p8yz" }
        );
        JsonAssert.AreEqual(response, mockResponse);
    }
}
