using Coss;
using Coss.Test.Unit.MockServer;
using Coss.Test.Utils;
using NUnit.Framework;

namespace Coss.Test.Unit.MockServer.Inboxes;

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
                  "object": "inbox",
                  "id": "id",
                  "address": "address",
                  "username": "username",
                  "domain": "domain",
                  "kind": "managed",
                  "display_name": "display_name",
                  "client_id": "client_id",
                  "can_send": true,
                  "sandbox": true,
                  "created_at": "2024-01-15T09:30:00.000Z",
                  "updated_at": "2024-01-15T09:30:00.000Z"
                },
                {
                  "object": "inbox",
                  "id": "id",
                  "address": "address",
                  "username": "username",
                  "domain": "domain",
                  "kind": "managed",
                  "display_name": "display_name",
                  "client_id": "client_id",
                  "can_send": true,
                  "sandbox": true,
                  "created_at": "2024-01-15T09:30:00.000Z",
                  "updated_at": "2024-01-15T09:30:00.000Z"
                }
              ],
              "has_more": true
            }
            """;

        Server
            .Given(WireMock.RequestBuilders.Request.Create().WithPath("/v1/inboxes").UsingGet())
            .RespondWith(
                WireMock
                    .ResponseBuilders.Response.Create()
                    .WithStatusCode(200)
                    .WithBody(mockResponse)
            );

        var response = await Client.Inboxes.ListAsync(new ListInboxesRequest());
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
                  "object": "inbox",
                  "id": "inbox_01k7c8m4q2f3e9v6t5r1n0p8yz",
                  "address": "support-agent@k3j9x2m7qp4l.inbound.coss.com",
                  "username": "support-agent",
                  "domain": "k3j9x2m7qp4l.inbound.coss.com",
                  "kind": "managed",
                  "display_name": "Acme Support",
                  "client_id": "agent-42",
                  "can_send": true,
                  "sandbox": true,
                  "created_at": "2026-10-10T12:00:00.000Z",
                  "updated_at": "2026-10-10T12:00:00.000Z"
                }
              ],
              "has_more": false
            }
            """;

        Server
            .Given(WireMock.RequestBuilders.Request.Create().WithPath("/v1/inboxes").UsingGet())
            .RespondWith(
                WireMock
                    .ResponseBuilders.Response.Create()
                    .WithStatusCode(200)
                    .WithBody(mockResponse)
            );

        var response = await Client.Inboxes.ListAsync(new ListInboxesRequest());
        JsonAssert.AreEqual(response, mockResponse);
    }
}
