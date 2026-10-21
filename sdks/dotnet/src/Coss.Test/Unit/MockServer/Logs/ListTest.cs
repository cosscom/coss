using Coss;
using Coss.Test.Unit.MockServer;
using Coss.Test.Utils;
using NUnit.Framework;

namespace Coss.Test.Unit.MockServer.Logs;

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
                  "object": "log",
                  "id": "id",
                  "occurred_at": "2024-01-15T09:30:00.000Z",
                  "source": "api",
                  "level": "info",
                  "type": "type",
                  "message": "message",
                  "request_id": "request_id",
                  "api_key_id": "api_key_id",
                  "method": "method",
                  "path": "path",
                  "route": "route",
                  "status_code": 1000000,
                  "duration_ms": 1000000,
                  "client_ip": "client_ip",
                  "user_agent": "user_agent",
                  "error_code": "error_code",
                  "resource_type": "resource_type",
                  "resource_id": "resource_id",
                  "recipient": "recipient",
                  "attributes": {
                    "attributes": {
                      "key": "value"
                    }
                  }
                },
                {
                  "object": "log",
                  "id": "id",
                  "occurred_at": "2024-01-15T09:30:00.000Z",
                  "source": "api",
                  "level": "info",
                  "type": "type",
                  "message": "message",
                  "request_id": "request_id",
                  "api_key_id": "api_key_id",
                  "method": "method",
                  "path": "path",
                  "route": "route",
                  "status_code": 1000000,
                  "duration_ms": 1000000,
                  "client_ip": "client_ip",
                  "user_agent": "user_agent",
                  "error_code": "error_code",
                  "resource_type": "resource_type",
                  "resource_id": "resource_id",
                  "recipient": "recipient",
                  "attributes": {
                    "attributes": {
                      "key": "value"
                    }
                  }
                }
              ],
              "has_more": true
            }
            """;

        Server
            .Given(WireMock.RequestBuilders.Request.Create().WithPath("/v1/logs").UsingGet())
            .RespondWith(
                WireMock
                    .ResponseBuilders.Response.Create()
                    .WithStatusCode(200)
                    .WithBody(mockResponse)
            );

        var response = await Client.Logs.ListAsync(new ListLogsRequest());
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
                  "object": "log",
                  "id": "log_01k7c8m4q2f3e9v6t5r1n0p8yz",
                  "occurred_at": "2026-01-15T09:30:00.000Z",
                  "source": "api",
                  "level": "info",
                  "type": "api.request",
                  "message": "POST /v1/emails 202",
                  "request_id": "req_01k7c8m4q2f3e9v6t5r1n0p8yz",
                  "api_key_id": "key_01k7c8m4q2f3e9v6t5r1n0p8yz",
                  "method": "POST",
                  "path": "/v1/emails",
                  "route": "/v1/emails",
                  "status_code": 202,
                  "duration_ms": 48,
                  "client_ip": "203.0.113.7",
                  "user_agent": "coss-node/0.1.0",
                  "resource_type": "email",
                  "resource_id": "email_01k7c8m4q2f3e9v6t5r1n0p8yz",
                  "attributes": {
                    "request": {
                      "body": {
                        "from": "hello@example.com",
                        "to": [
                          "user@example.com"
                        ],
                        "subject": "Hi"
                      }
                    },
                    "response": {
                      "body": {
                        "object": "email",
                        "id": "email_01k7c8m4q2f3e9v6t5r1n0p8yz"
                      }
                    }
                  }
                }
              ],
              "has_more": false
            }
            """;

        Server
            .Given(WireMock.RequestBuilders.Request.Create().WithPath("/v1/logs").UsingGet())
            .RespondWith(
                WireMock
                    .ResponseBuilders.Response.Create()
                    .WithStatusCode(200)
                    .WithBody(mockResponse)
            );

        var response = await Client.Logs.ListAsync(new ListLogsRequest());
        JsonAssert.AreEqual(response, mockResponse);
    }
}
