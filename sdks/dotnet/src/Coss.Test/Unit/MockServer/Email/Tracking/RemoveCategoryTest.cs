using Coss.Email;
using Coss.Test.Unit.MockServer;
using Coss.Test.Utils;
using NUnit.Framework;

namespace Coss.Test.Unit.MockServer.Email.Tracking;

[TestFixture]
[Parallelizable(ParallelScope.Self)]
public class RemoveCategoryTest : BaseMockServerTest
{
    [NUnit.Framework.Test]
    public async Task MockServerTest_1()
    {
        const string mockResponse = """
            {
              "object": "tracking_rule",
              "id": "id",
              "category": "category",
              "deleted": true
            }
            """;

        Server
            .Given(
                WireMock
                    .RequestBuilders.Request.Create()
                    .WithPath("/v1/tracking_settings/categories/category")
                    .UsingDelete()
            )
            .RespondWith(
                WireMock
                    .ResponseBuilders.Response.Create()
                    .WithStatusCode(200)
                    .WithBody(mockResponse)
            );

        var response = await Client.Email.Tracking.RemoveCategoryAsync(
            new RemoveCategoryTrackingRequest { Category = "category" }
        );
        JsonAssert.AreEqual(response, mockResponse);
    }

    [NUnit.Framework.Test]
    public async Task MockServerTest_2()
    {
        const string mockResponse = """
            {
              "object": "tracking_rule",
              "id": "etr_01k7c8m4q2f3e9v6t5r1n0p8yz",
              "category": "password-reset",
              "deleted": true
            }
            """;

        Server
            .Given(
                WireMock
                    .RequestBuilders.Request.Create()
                    .WithPath("/v1/tracking_settings/categories/password-reset")
                    .UsingDelete()
            )
            .RespondWith(
                WireMock
                    .ResponseBuilders.Response.Create()
                    .WithStatusCode(200)
                    .WithBody(mockResponse)
            );

        var response = await Client.Email.Tracking.RemoveCategoryAsync(
            new RemoveCategoryTrackingRequest { Category = "password-reset" }
        );
        JsonAssert.AreEqual(response, mockResponse);
    }
}
