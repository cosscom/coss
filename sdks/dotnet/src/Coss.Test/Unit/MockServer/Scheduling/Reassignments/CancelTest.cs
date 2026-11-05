using Coss.Scheduling;
using Coss.Test.Unit.MockServer;
using Coss.Test.Utils;
using NUnit.Framework;

namespace Coss.Test.Unit.MockServer.Scheduling.Reassignments;

[TestFixture]
[Parallelizable(ParallelScope.Self)]
public class CancelTest : BaseMockServerTest
{
    [NUnit.Framework.Test]
    public async Task MockServerTest_1()
    {
        const string mockResponse = """
            {
              "object": "scheduling.reassignment",
              "id": "id",
              "status": "pending",
              "reason_code": "host_unavailable",
              "out_of_office": "out_of_office",
              "undo_of": "undo_of",
              "counts": {
                "total": 1.1,
                "pending": 1.1,
                "reassigned": 1.1,
                "skipped": 1.1,
                "no_candidate": 1.1,
                "failed": 1.1,
                "cancelled": 1.1
              },
              "created_at": "created_at",
              "started_at": "started_at",
              "finished_at": "finished_at"
            }
            """;

        Server
            .Given(
                WireMock
                    .RequestBuilders.Request.Create()
                    .WithPath("/v1/scheduling/reassignments/id/cancel")
                    .UsingPost()
            )
            .RespondWith(
                WireMock
                    .ResponseBuilders.Response.Create()
                    .WithStatusCode(200)
                    .WithBody(mockResponse)
            );

        var response = await Client.Scheduling.Reassignments.CancelAsync(
            new CancelReassignmentsRequest { Id = "id" }
        );
        JsonAssert.AreEqual(response, mockResponse);
    }

    [NUnit.Framework.Test]
    public async Task MockServerTest_2()
    {
        const string mockResponse = """
            {
              "object": "scheduling.reassignment",
              "id": "reasn_01kd2m9a0b1c2d3e4f5g6h7j8m",
              "status": "completed",
              "reason_code": "out_of_office",
              "out_of_office": "ooo_01kd2m9a0b1c2d3e4f5g6h7j8m",
              "undo_of": null,
              "counts": {
                "total": 12,
                "pending": 0,
                "reassigned": 11,
                "skipped": 0,
                "no_candidate": 1,
                "failed": 0,
                "cancelled": 0
              },
              "created_at": "2027-01-01T10:00:00.000Z",
              "started_at": "2027-01-01T10:00:01.000Z",
              "finished_at": "2027-01-01T10:00:09.000Z"
            }
            """;

        Server
            .Given(
                WireMock
                    .RequestBuilders.Request.Create()
                    .WithPath("/v1/scheduling/reassignments/id/cancel")
                    .UsingPost()
            )
            .RespondWith(
                WireMock
                    .ResponseBuilders.Response.Create()
                    .WithStatusCode(200)
                    .WithBody(mockResponse)
            );

        var response = await Client.Scheduling.Reassignments.CancelAsync(
            new CancelReassignmentsRequest { Id = "id" }
        );
        JsonAssert.AreEqual(response, mockResponse);
    }
}
