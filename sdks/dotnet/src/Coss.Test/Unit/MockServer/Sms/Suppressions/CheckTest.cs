using Coss.Test.Unit.MockServer;
using Coss.Test.Utils;
using NUnit.Framework;

namespace Coss.Test.Unit.MockServer.Sms.Suppressions;

[TestFixture]
[Parallelizable(ParallelScope.Self)]
public class CheckTest : BaseMockServerTest
{
    [NUnit.Framework.Test]
    public async Task MockServerTest_1()
    {
        const string mockResponse = """
            {
              "object": "sms_suppression_check",
              "phone_number": "phone_number",
              "suppressed": true,
              "suppression": {
                "object": "sms_suppression",
                "id": "id",
                "phone_number": "phone_number",
                "reason": "opt_out",
                "sms_id": "sms_id",
                "created_at": "2024-01-15T09:30:00.000Z"
              }
            }
            """;

        Server
            .Given(
                WireMock
                    .RequestBuilders.Request.Create()
                    .WithPath("/v1/sms/suppressions/check")
                    .WithParam("phone_number", "phone_number")
                    .UsingGet()
            )
            .RespondWith(
                WireMock
                    .ResponseBuilders.Response.Create()
                    .WithStatusCode(200)
                    .WithBody(mockResponse)
            );

        var response = await Client.Sms.Suppressions.CheckAsync(
            new Coss.Sms_.CheckSuppressionsRequest { PhoneNumber = "phone_number" }
        );
        JsonAssert.AreEqual(response, mockResponse);
    }

    [NUnit.Framework.Test]
    public async Task MockServerTest_2()
    {
        const string mockResponse = """
            {
              "object": "sms_suppression_check",
              "phone_number": "+14155550199",
              "suppressed": false,
              "suppression": null
            }
            """;

        Server
            .Given(
                WireMock
                    .RequestBuilders.Request.Create()
                    .WithPath("/v1/sms/suppressions/check")
                    .WithParam("phone_number", "phone_number")
                    .UsingGet()
            )
            .RespondWith(
                WireMock
                    .ResponseBuilders.Response.Create()
                    .WithStatusCode(200)
                    .WithBody(mockResponse)
            );

        var response = await Client.Sms.Suppressions.CheckAsync(
            new Coss.Sms_.CheckSuppressionsRequest { PhoneNumber = "phone_number" }
        );
        JsonAssert.AreEqual(response, mockResponse);
    }
}
