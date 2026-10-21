using Coss.Sms_;
using Coss.Test.Unit.MockServer;
using Coss.Test.Utils;
using NUnit.Framework;

namespace Coss.Test.Unit.MockServer.Sms.Suppressions;

[TestFixture]
[Parallelizable(ParallelScope.Self)]
public class AddTest : BaseMockServerTest
{
    [NUnit.Framework.Test]
    public async Task MockServerTest_1()
    {
        const string requestJson = """
            {
              "phone_number": "phone_number"
            }
            """;

        const string mockResponse = """
            {
              "object": "sms_suppression",
              "id": "id",
              "phone_number": "phone_number",
              "reason": "opt_out",
              "sms_id": "sms_id",
              "created_at": "2024-01-15T09:30:00.000Z"
            }
            """;

        Server
            .Given(
                WireMock
                    .RequestBuilders.Request.Create()
                    .WithPath("/v1/sms/suppressions")
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

        var response = await Client.Sms.Suppressions.AddAsync(
            new CreateSmsSuppressionRequest { PhoneNumber = "phone_number" }
        );
        JsonAssert.AreEqual(response, mockResponse);
    }

    [NUnit.Framework.Test]
    public async Task MockServerTest_2()
    {
        const string requestJson = """
            {
              "phone_number": "+14155550199"
            }
            """;

        const string mockResponse = """
            {
              "object": "sms_suppression",
              "id": "smssup_01k7c8m4q2f3e9v6t5r1n0p8yz",
              "phone_number": "+14155550199",
              "reason": "opt_out",
              "sms_id": null,
              "created_at": "2026-11-10T12:05:00.000Z"
            }
            """;

        Server
            .Given(
                WireMock
                    .RequestBuilders.Request.Create()
                    .WithPath("/v1/sms/suppressions")
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

        var response = await Client.Sms.Suppressions.AddAsync(
            new CreateSmsSuppressionRequest { PhoneNumber = "+14155550199" }
        );
        JsonAssert.AreEqual(response, mockResponse);
    }
}
