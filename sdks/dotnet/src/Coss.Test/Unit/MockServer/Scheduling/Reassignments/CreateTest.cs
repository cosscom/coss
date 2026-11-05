using Coss;
using Coss.Scheduling;
using Coss.Test.Unit.MockServer;
using Coss.Test.Utils;
using NUnit.Framework;

namespace Coss.Test.Unit.MockServer.Scheduling.Reassignments;

[TestFixture]
[Parallelizable(ParallelScope.Self)]
public class CreateTest : BaseMockServerTest
{
    [NUnit.Framework.Test]
    public async Task MockServerTest_1()
    {
        const string requestJson = """
            {
              "selection": {},
              "reason_code": "host_unavailable"
            }
            """;

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
                    .WithPath("/v1/scheduling/reassignments")
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

        var response = await Client.Scheduling.Reassignments.CreateAsync(
            new CreateSchedulingReassignmentRequest
            {
                Selection = new SchedulingReassignmentSelection
                {
                    Host = null,
                    OutOfOffice = null,
                    BookingIds = null,
                    Series = null,
                    StartAfter = null,
                    StartBefore = null,
                    EventTypes = null,
                    ExternalConflict = null,
                },
                Strategy = null,
                ReasonCode = CreateSchedulingReassignmentRequestReasonCode.HostUnavailable,
                Note = null,
                Overrides = null,
                Notify = null,
            }
        );
        JsonAssert.AreEqual(response, mockResponse);
    }

    [NUnit.Framework.Test]
    public async Task MockServerTest_2()
    {
        const string requestJson = """
            {
              "selection": {
                "out_of_office": "ooo_01kd2m9a0b1c2d3e4f5g6h7j8m"
              },
              "strategy": {
                "preferred_hosts": [
                  "doctor_518"
                ]
              },
              "reason_code": "out_of_office"
            }
            """;

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
                    .WithPath("/v1/scheduling/reassignments")
                    .WithHeader("Idempotency-Key", "welcome-user-123")
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

        var response = await Client.Scheduling.Reassignments.CreateAsync(
            new CreateSchedulingReassignmentRequest
            {
                IdempotencyKey = "welcome-user-123",
                Selection = new SchedulingReassignmentSelection
                {
                    OutOfOffice = "ooo_01kd2m9a0b1c2d3e4f5g6h7j8m",
                },
                Strategy = new SchedulingReassignmentStrategy
                {
                    PreferredHosts = new List<string>() { "doctor_518" },
                },
                ReasonCode = CreateSchedulingReassignmentRequestReasonCode.OutOfOffice,
            }
        );
        JsonAssert.AreEqual(response, mockResponse);
    }
}
