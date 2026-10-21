using Coss.LogDrains;
using Coss.Test.Unit.MockServer;
using Coss.Test.Utils;
using NUnit.Framework;

namespace Coss.Test.Unit.MockServer.LogDrains.Batches;

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
                  "object": "log_drain_batch",
                  "id": "id",
                  "drain_id": "drain_id",
                  "status": "pending",
                  "line_count": 1000000,
                  "byte_size": 1000000,
                  "attempt_count": 1000000,
                  "next_attempt_at": "2024-01-15T09:30:00.000Z",
                  "last_status_code": 1000000,
                  "last_error": "last_error",
                  "attempts": [
                    {
                      "object": "log_drain_attempt",
                      "id": "id",
                      "attempted_at": "2024-01-15T09:30:00.000Z",
                      "status_code": 1000000,
                      "duration_ms": 1000000,
                      "error": "error",
                      "response_excerpt": "response_excerpt"
                    },
                    {
                      "object": "log_drain_attempt",
                      "id": "id",
                      "attempted_at": "2024-01-15T09:30:00.000Z",
                      "status_code": 1000000,
                      "duration_ms": 1000000,
                      "error": "error",
                      "response_excerpt": "response_excerpt"
                    }
                  ],
                  "created_at": "2024-01-15T09:30:00.000Z",
                  "updated_at": "2024-01-15T09:30:00.000Z"
                },
                {
                  "object": "log_drain_batch",
                  "id": "id",
                  "drain_id": "drain_id",
                  "status": "pending",
                  "line_count": 1000000,
                  "byte_size": 1000000,
                  "attempt_count": 1000000,
                  "next_attempt_at": "2024-01-15T09:30:00.000Z",
                  "last_status_code": 1000000,
                  "last_error": "last_error",
                  "attempts": [
                    {
                      "object": "log_drain_attempt",
                      "id": "id",
                      "attempted_at": "2024-01-15T09:30:00.000Z",
                      "status_code": 1000000,
                      "duration_ms": 1000000,
                      "error": "error",
                      "response_excerpt": "response_excerpt"
                    },
                    {
                      "object": "log_drain_attempt",
                      "id": "id",
                      "attempted_at": "2024-01-15T09:30:00.000Z",
                      "status_code": 1000000,
                      "duration_ms": 1000000,
                      "error": "error",
                      "response_excerpt": "response_excerpt"
                    }
                  ],
                  "created_at": "2024-01-15T09:30:00.000Z",
                  "updated_at": "2024-01-15T09:30:00.000Z"
                }
              ],
              "has_more": true
            }
            """;

        Server
            .Given(
                WireMock
                    .RequestBuilders.Request.Create()
                    .WithPath("/v1/log_drains/id/batches")
                    .UsingGet()
            )
            .RespondWith(
                WireMock
                    .ResponseBuilders.Response.Create()
                    .WithStatusCode(200)
                    .WithBody(mockResponse)
            );

        var response = await Client.LogDrains.Batches.ListAsync(
            new ListBatchesRequest { Id = "id" }
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
                  "object": "log_drain_batch",
                  "id": "drainbat_01k7c8n2b5d7f9h1k3m5p7r9tv",
                  "drain_id": "drain_01k7c8m4q2f3e9v6t5r1n0p8yz",
                  "status": "succeeded",
                  "line_count": 42,
                  "byte_size": 31870,
                  "attempt_count": 1,
                  "next_attempt_at": null,
                  "last_status_code": 200,
                  "last_error": null,
                  "attempts": [
                    {
                      "object": "log_drain_attempt",
                      "id": "drainatt_01k7c8n2c9e1g3j5l7n9q1s3uw",
                      "attempted_at": "2026-01-15T09:30:01.000Z",
                      "status_code": 200,
                      "duration_ms": 182,
                      "error": null,
                      "response_excerpt": "ok"
                    }
                  ],
                  "created_at": "2026-01-15T09:30:00.000Z",
                  "updated_at": "2026-01-15T09:30:01.000Z"
                }
              ],
              "has_more": false
            }
            """;

        Server
            .Given(
                WireMock
                    .RequestBuilders.Request.Create()
                    .WithPath("/v1/log_drains/drain_01k7c8m4q2f3e9v6t5r1n0p8yz/batches")
                    .UsingGet()
            )
            .RespondWith(
                WireMock
                    .ResponseBuilders.Response.Create()
                    .WithStatusCode(200)
                    .WithBody(mockResponse)
            );

        var response = await Client.LogDrains.Batches.ListAsync(
            new ListBatchesRequest { Id = "drain_01k7c8m4q2f3e9v6t5r1n0p8yz" }
        );
        JsonAssert.AreEqual(response, mockResponse);
    }
}
