using Coss;
using Coss.Test.Unit.MockServer;
using Coss.Test.Utils;
using NUnit.Framework;

namespace Coss.Test.Unit.MockServer.Sms;

[TestFixture]
[Parallelizable(ParallelScope.Self)]
public class ListEventsTest : BaseMockServerTest
{
    [NUnit.Framework.Test]
    public async Task MockServerTest_1()
    {
        const string mockResponse = """
            {
              "object": "list",
              "data": [
                {
                  "object": "sms_event",
                  "id": "id",
                  "sms_id": "sms_id",
                  "type": "sms.scheduled",
                  "occurred_at": "2024-01-15T09:30:00.000Z",
                  "data": {
                    "failure": {
                      "code": "code",
                      "message": "message"
                    },
                    "provider_error_code": "provider_error_code",
                    "suppression": {
                      "id": "id",
                      "reason": "opt_out"
                    }
                  }
                },
                {
                  "object": "sms_event",
                  "id": "id",
                  "sms_id": "sms_id",
                  "type": "sms.scheduled",
                  "occurred_at": "2024-01-15T09:30:00.000Z",
                  "data": {
                    "failure": {
                      "code": "code",
                      "message": "message"
                    },
                    "provider_error_code": "provider_error_code",
                    "suppression": {
                      "id": "id",
                      "reason": "opt_out"
                    }
                  }
                }
              ],
              "has_more": true
            }
            """;

        Server
            .Given(
                WireMock.RequestBuilders.Request.Create().WithPath("/v1/sms/id/events").UsingGet()
            )
            .RespondWith(
                WireMock
                    .ResponseBuilders.Response.Create()
                    .WithStatusCode(200)
                    .WithBody(mockResponse)
            );

        var response = await Client.Sms.ListEventsAsync(new ListEventsSmsRequest { Id = "id" });
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
                  "object": "sms_event",
                  "id": "smsevt_01k7c8m4r0c2b8w9y3d5f6g7h8",
                  "sms_id": "sms_01k7c8m4q2f3e9v6t5r1n0p8yz",
                  "type": "sms.delivered",
                  "occurred_at": "2026-11-10T12:00:04.000Z",
                  "data": {}
                }
              ],
              "has_more": false
            }
            """;

        Server
            .Given(
                WireMock
                    .RequestBuilders.Request.Create()
                    .WithPath("/v1/sms/sms_01k7c8m4q2f3e9v6t5r1n0p8yz/events")
                    .UsingGet()
            )
            .RespondWith(
                WireMock
                    .ResponseBuilders.Response.Create()
                    .WithStatusCode(200)
                    .WithBody(mockResponse)
            );

        var response = await Client.Sms.ListEventsAsync(
            new ListEventsSmsRequest { Id = "sms_01k7c8m4q2f3e9v6t5r1n0p8yz" }
        );
        JsonAssert.AreEqual(response, mockResponse);
    }
}
