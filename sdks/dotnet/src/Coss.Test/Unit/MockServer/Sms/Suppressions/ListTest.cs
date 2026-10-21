using Coss.Test.Unit.MockServer;
using Coss.Test.Utils;
using NUnit.Framework;

namespace Coss.Test.Unit.MockServer.Sms.Suppressions;

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
                  "object": "sms_suppression",
                  "id": "id",
                  "phone_number": "phone_number",
                  "reason": "opt_out",
                  "sms_id": "sms_id",
                  "created_at": "2024-01-15T09:30:00.000Z"
                },
                {
                  "object": "sms_suppression",
                  "id": "id",
                  "phone_number": "phone_number",
                  "reason": "opt_out",
                  "sms_id": "sms_id",
                  "created_at": "2024-01-15T09:30:00.000Z"
                }
              ],
              "has_more": true
            }
            """;

        Server
            .Given(
                WireMock
                    .RequestBuilders.Request.Create()
                    .WithPath("/v1/sms/suppressions")
                    .UsingGet()
            )
            .RespondWith(
                WireMock
                    .ResponseBuilders.Response.Create()
                    .WithStatusCode(200)
                    .WithBody(mockResponse)
            );

        var response = await Client.Sms.Suppressions.ListAsync(
            new Coss.Sms_.ListSuppressionsRequest()
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
                  "object": "sms_suppression",
                  "id": "smssup_01k7c8m4q2f3e9v6t5r1n0p8yz",
                  "phone_number": "+14155550199",
                  "reason": "opt_out",
                  "sms_id": null,
                  "created_at": "2026-11-10T12:05:00.000Z"
                }
              ],
              "has_more": false
            }
            """;

        Server
            .Given(
                WireMock
                    .RequestBuilders.Request.Create()
                    .WithPath("/v1/sms/suppressions")
                    .UsingGet()
            )
            .RespondWith(
                WireMock
                    .ResponseBuilders.Response.Create()
                    .WithStatusCode(200)
                    .WithBody(mockResponse)
            );

        var response = await Client.Sms.Suppressions.ListAsync(
            new Coss.Sms_.ListSuppressionsRequest()
        );
        JsonAssert.AreEqual(response, mockResponse);
    }
}
