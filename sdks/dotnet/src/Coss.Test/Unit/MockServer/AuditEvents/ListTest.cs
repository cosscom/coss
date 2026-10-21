using Coss;
using Coss.Test.Unit.MockServer;
using Coss.Test.Utils;
using NUnit.Framework;

namespace Coss.Test.Unit.MockServer.AuditEvents;

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
                  "object": "audit_event",
                  "id": "id",
                  "created_at": "2024-01-15T09:30:00.000Z",
                  "actor_type": "user",
                  "actor_id": "actor_id",
                  "actor_label": "actor_label",
                  "action": "action",
                  "target_type": "target_type",
                  "target_id": "target_id",
                  "target_label": "target_label",
                  "project_id": "project_id",
                  "environment_id": "environment_id",
                  "metadata": {
                    "metadata": {
                      "key": "value"
                    }
                  },
                  "client_ip": "client_ip",
                  "user_agent": "user_agent"
                },
                {
                  "object": "audit_event",
                  "id": "id",
                  "created_at": "2024-01-15T09:30:00.000Z",
                  "actor_type": "user",
                  "actor_id": "actor_id",
                  "actor_label": "actor_label",
                  "action": "action",
                  "target_type": "target_type",
                  "target_id": "target_id",
                  "target_label": "target_label",
                  "project_id": "project_id",
                  "environment_id": "environment_id",
                  "metadata": {
                    "metadata": {
                      "key": "value"
                    }
                  },
                  "client_ip": "client_ip",
                  "user_agent": "user_agent"
                }
              ],
              "has_more": true
            }
            """;

        Server
            .Given(
                WireMock.RequestBuilders.Request.Create().WithPath("/v1/audit_events").UsingGet()
            )
            .RespondWith(
                WireMock
                    .ResponseBuilders.Response.Create()
                    .WithStatusCode(200)
                    .WithBody(mockResponse)
            );

        var response = await Client.AuditEvents.ListAsync(new ListAuditEventsRequest());
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
                  "object": "audit_event",
                  "id": "oaudit_01k7c8m4q2f3e9v6t5r1n0p8yz",
                  "created_at": "2026-01-15T09:30:00.000Z",
                  "actor_type": "api_key",
                  "actor_id": "key_01k7c8m4q2f3e9v6t5r1n0p8yz",
                  "actor_label": "key_01k7c8m4q2f3e9v6t5r1n0p8yz",
                  "action": "suppression.created",
                  "target_type": "suppression",
                  "target_id": "sup_01k7c8m4q2f3e9v6t5r1n0p8yz",
                  "target_label": "user@example.com",
                  "project_id": "proj_01k7c8m4q2f3e9v6t5r1n0p8yz",
                  "environment_id": "env_01k7c8m4q2f3e9v6t5r1n0p8yz",
                  "metadata": {
                    "scope": "*",
                    "request_id": "req_01k7c8m4q2f3e9v6t5r1n0p8yz"
                  },
                  "client_ip": "203.0.113.7",
                  "user_agent": "coss-node/0.1.0"
                }
              ],
              "has_more": false
            }
            """;

        Server
            .Given(
                WireMock.RequestBuilders.Request.Create().WithPath("/v1/audit_events").UsingGet()
            )
            .RespondWith(
                WireMock
                    .ResponseBuilders.Response.Create()
                    .WithStatusCode(200)
                    .WithBody(mockResponse)
            );

        var response = await Client.AuditEvents.ListAsync(new ListAuditEventsRequest());
        JsonAssert.AreEqual(response, mockResponse);
    }
}
