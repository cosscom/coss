using Coss.Email;
using Coss.Test.Unit.MockServer;
using NUnit.Framework;

namespace Coss.Test.Unit.MockServer.Email.Suppressions;

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
                WireMock
                    .RequestBuilders.Request.Create()
                    .WithPath("/v1/suppressions/export")
                    .UsingGet()
            )
            .RespondWith(
                WireMock
                    .ResponseBuilders.Response.Create()
                    .WithStatusCode(200)
                    .WithBody(mockResponse)
            );

        var response = await Client.Email.Suppressions.ExportAsync(new ExportSuppressionsRequest());
        Assert.That(response, Is.EqualTo(mockResponse));
    }
}
