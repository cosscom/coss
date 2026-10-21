using Coss;
using Coss.Test.Unit.MockServer;
using Coss.Test.Utils;
using NUnit.Framework;

namespace Coss.Test.Unit.MockServer.Email;

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
                  "object": "email_event",
                  "id": "id",
                  "email_id": "email_id",
                  "type": "email.sent",
                  "recipient": "recipient",
                  "occurred_at": "2024-01-15T09:30:00.000Z",
                  "data": {
                    "bounce": {
                      "type": "permanent",
                      "sub_type": "sub_type",
                      "diagnostic_code": "diagnostic_code"
                    },
                    "complaint": {
                      "feedback_type": "feedback_type",
                      "sub_type": "sub_type"
                    },
                    "delay": {
                      "type": "type",
                      "expires_at": "2024-01-15T09:30:00.000Z",
                      "diagnostic_code": "diagnostic_code"
                    },
                    "delivery": {
                      "smtp_response": "smtp_response"
                    },
                    "failure": {
                      "code": "code",
                      "message": "message"
                    },
                    "suppression": {
                      "id": "id",
                      "scope": "scope",
                      "reason": "bounce"
                    },
                    "unsubscribe": {
                      "contact_id": "contact_id",
                      "topic": "topic"
                    },
                    "open": {
                      "user_agent": "user_agent"
                    },
                    "click": {
                      "url": "url",
                      "link_position": 1000000,
                      "user_agent": "user_agent"
                    },
                    "reschedule": {
                      "scheduled_at": "2024-01-15T09:30:00.000Z",
                      "previous_scheduled_at": "2024-01-15T09:30:00.000Z"
                    }
                  }
                },
                {
                  "object": "email_event",
                  "id": "id",
                  "email_id": "email_id",
                  "type": "email.sent",
                  "recipient": "recipient",
                  "occurred_at": "2024-01-15T09:30:00.000Z",
                  "data": {
                    "bounce": {
                      "type": "permanent",
                      "sub_type": "sub_type",
                      "diagnostic_code": "diagnostic_code"
                    },
                    "complaint": {
                      "feedback_type": "feedback_type",
                      "sub_type": "sub_type"
                    },
                    "delay": {
                      "type": "type",
                      "expires_at": "2024-01-15T09:30:00.000Z",
                      "diagnostic_code": "diagnostic_code"
                    },
                    "delivery": {
                      "smtp_response": "smtp_response"
                    },
                    "failure": {
                      "code": "code",
                      "message": "message"
                    },
                    "suppression": {
                      "id": "id",
                      "scope": "scope",
                      "reason": "bounce"
                    },
                    "unsubscribe": {
                      "contact_id": "contact_id",
                      "topic": "topic"
                    },
                    "open": {
                      "user_agent": "user_agent"
                    },
                    "click": {
                      "url": "url",
                      "link_position": 1000000,
                      "user_agent": "user_agent"
                    },
                    "reschedule": {
                      "scheduled_at": "2024-01-15T09:30:00.000Z",
                      "previous_scheduled_at": "2024-01-15T09:30:00.000Z"
                    }
                  }
                }
              ],
              "has_more": true
            }
            """;

        Server
            .Given(
                WireMock
                    .RequestBuilders.Request.Create()
                    .WithPath("/v1/emails/id/events")
                    .UsingGet()
            )
            .RespondWith(
                WireMock
                    .ResponseBuilders.Response.Create()
                    .WithStatusCode(200)
                    .WithBody(mockResponse)
            );

        var response = await Client.Email.ListEventsAsync(new ListEventsEmailRequest { Id = "id" });
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
                  "object": "email_event",
                  "id": "evt_01k7c8m4r0c2b8w9y3d5f6g7h8",
                  "email_id": "email_01k7c8m4q2f3e9v6t5r1n0p8yz",
                  "type": "email.sent",
                  "occurred_at": "2026-10-10T12:00:01.000Z",
                  "data": {}
                },
                {
                  "object": "email_event",
                  "id": "evt_01k7c8m4q2f3e9v6t5r1n0p8yz",
                  "email_id": "email_01k7c8m4q2f3e9v6t5r1n0p8yz",
                  "type": "email.delivered",
                  "recipient": "user@example.com",
                  "occurred_at": "2026-10-10T12:00:02.000Z",
                  "data": {
                    "delivery": {
                      "smtp_response": "250 2.0.0 OK"
                    }
                  }
                }
              ],
              "has_more": false
            }
            """;

        Server
            .Given(
                WireMock
                    .RequestBuilders.Request.Create()
                    .WithPath("/v1/emails/email_01k7c8m4q2f3e9v6t5r1n0p8yz/events")
                    .UsingGet()
            )
            .RespondWith(
                WireMock
                    .ResponseBuilders.Response.Create()
                    .WithStatusCode(200)
                    .WithBody(mockResponse)
            );

        var response = await Client.Email.ListEventsAsync(
            new ListEventsEmailRequest { Id = "email_01k7c8m4q2f3e9v6t5r1n0p8yz" }
        );
        JsonAssert.AreEqual(response, mockResponse);
    }
}
