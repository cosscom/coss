using Coss.Test.Unit.MockServer;
using Coss.Test.Utils;
using NUnit.Framework;

namespace Coss.Test.Unit.MockServer.Sms.Numbers;

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
                  "object": "sms_number",
                  "id": "id",
                  "phone_number": "phone_number",
                  "kind": "local",
                  "country": "country",
                  "status": "pending",
                  "registration_status": "draft",
                  "can_send": true,
                  "receives_here": true,
                  "created_at": "2024-01-15T09:30:00.000Z"
                },
                {
                  "object": "sms_number",
                  "id": "id",
                  "phone_number": "phone_number",
                  "kind": "local",
                  "country": "country",
                  "status": "pending",
                  "registration_status": "draft",
                  "can_send": true,
                  "receives_here": true,
                  "created_at": "2024-01-15T09:30:00.000Z"
                }
              ],
              "has_more": true
            }
            """;

        Server
            .Given(WireMock.RequestBuilders.Request.Create().WithPath("/v1/sms/numbers").UsingGet())
            .RespondWith(
                WireMock
                    .ResponseBuilders.Response.Create()
                    .WithStatusCode(200)
                    .WithBody(mockResponse)
            );

        var response = await Client.Sms.Numbers.ListAsync();
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
                  "object": "sms_number",
                  "id": "num_01k7c8m4q2f3e9v6t5r1n0p8yz",
                  "phone_number": "+14155550123",
                  "kind": "local",
                  "country": "US",
                  "status": "active",
                  "registration_status": "approved",
                  "can_send": true,
                  "receives_here": true,
                  "created_at": "2026-11-01T09:00:00.000Z"
                }
              ],
              "has_more": false
            }
            """;

        Server
            .Given(WireMock.RequestBuilders.Request.Create().WithPath("/v1/sms/numbers").UsingGet())
            .RespondWith(
                WireMock
                    .ResponseBuilders.Response.Create()
                    .WithStatusCode(200)
                    .WithBody(mockResponse)
            );

        var response = await Client.Sms.Numbers.ListAsync();
        JsonAssert.AreEqual(response, mockResponse);
    }
}
