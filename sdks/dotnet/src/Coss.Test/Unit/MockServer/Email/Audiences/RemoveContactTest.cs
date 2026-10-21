using Coss.Email;
using Coss.Test.Unit.MockServer;
using Coss.Test.Utils;
using NUnit.Framework;

namespace Coss.Test.Unit.MockServer.Email.Audiences;

[TestFixture]
[Parallelizable(ParallelScope.Self)]
public class RemoveContactTest : BaseMockServerTest
{
    [NUnit.Framework.Test]
    public async Task MockServerTest_1()
    {
        const string mockResponse = """
            {
              "object": "audience_contact",
              "audience_id": "audience_id",
              "contact_id": "contact_id",
              "deleted": true
            }
            """;

        Server
            .Given(
                WireMock
                    .RequestBuilders.Request.Create()
                    .WithPath("/v1/audiences/id/contacts/contact_id")
                    .UsingDelete()
            )
            .RespondWith(
                WireMock
                    .ResponseBuilders.Response.Create()
                    .WithStatusCode(200)
                    .WithBody(mockResponse)
            );

        var response = await Client.Email.Audiences.RemoveContactAsync(
            new RemoveContactAudiencesRequest { Id = "id", ContactId = "contact_id" }
        );
        JsonAssert.AreEqual(response, mockResponse);
    }

    [NUnit.Framework.Test]
    public async Task MockServerTest_2()
    {
        const string mockResponse = """
            {
              "object": "audience_contact",
              "audience_id": "audience_id",
              "contact_id": "contact_id",
              "deleted": true
            }
            """;

        Server
            .Given(
                WireMock
                    .RequestBuilders.Request.Create()
                    .WithPath(
                        "/v1/audiences/aud_01k7c8m4q2f3e9v6t5r1n0p8yz/contacts/contact_01k7c8m4q2f3e9v6t5r1n0p8yz"
                    )
                    .UsingDelete()
            )
            .RespondWith(
                WireMock
                    .ResponseBuilders.Response.Create()
                    .WithStatusCode(200)
                    .WithBody(mockResponse)
            );

        var response = await Client.Email.Audiences.RemoveContactAsync(
            new RemoveContactAudiencesRequest
            {
                Id = "aud_01k7c8m4q2f3e9v6t5r1n0p8yz",
                ContactId = "contact_01k7c8m4q2f3e9v6t5r1n0p8yz",
            }
        );
        JsonAssert.AreEqual(response, mockResponse);
    }
}
