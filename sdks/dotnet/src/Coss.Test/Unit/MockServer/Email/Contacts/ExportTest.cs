using Coss.Email;
using Coss.Test.Unit.MockServer;
using NUnit.Framework;

namespace Coss.Test.Unit.MockServer.Email.Contacts;

[TestFixture]
[Parallelizable(ParallelScope.Self)]
public class ExportTest : BaseMockServerTest
{
    [NUnit.Framework.Test]
    public async Task MockServerTest()
    {
        const string mockResponse = "string";

        Server
            .Given(
                WireMock.RequestBuilders.Request.Create().WithPath("/v1/contacts/export").UsingGet()
            )
            .RespondWith(
                WireMock
                    .ResponseBuilders.Response.Create()
                    .WithStatusCode(200)
                    .WithBody(mockResponse)
            );

        var response = await Client.Email.Contacts.ExportAsync(new ExportContactsRequest());
        Assert.That(response, Is.EqualTo(mockResponse));
    }
}
