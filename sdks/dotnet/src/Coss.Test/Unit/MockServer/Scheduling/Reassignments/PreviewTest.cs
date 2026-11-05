using Coss;
using Coss.Scheduling;
using Coss.Test.Unit.MockServer;
using Coss.Test.Utils;
using NUnit.Framework;

namespace Coss.Test.Unit.MockServer.Scheduling.Reassignments;

[TestFixture]
[Parallelizable(ParallelScope.Self)]
public class PreviewTest : BaseMockServerTest
{
    [NUnit.Framework.Test]
    public async Task MockServerTest_1()
    {
        const string requestJson = """
            {
              "selection": {}
            }
            """;

        const string mockResponse = """
            {
              "object": "scheduling.reassignment_preview",
              "items": [
                {
                  "booking": "booking",
                  "event_type": "event_type",
                  "title": "title",
                  "status": "held",
                  "start": "start",
                  "end": "end",
                  "series": "series",
                  "group_session": "group_session",
                  "from_host": "from_host",
                  "to_host": "to_host",
                  "reason": "reason"
                },
                {
                  "booking": "booking",
                  "event_type": "event_type",
                  "title": "title",
                  "status": "held",
                  "start": "start",
                  "end": "end",
                  "series": "series",
                  "group_session": "group_session",
                  "from_host": "from_host",
                  "to_host": "to_host",
                  "reason": "reason"
                }
              ],
              "truncated": true
            }
            """;

        Server
            .Given(
                WireMock
                    .RequestBuilders.Request.Create()
                    .WithPath("/v1/scheduling/reassignments/preview")
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

        var response = await Client.Scheduling.Reassignments.PreviewAsync(
            new PreviewSchedulingReassignmentRequest
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
                Overrides = null,
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
                "host": "doctor_482",
                "start_before": "2027-08-14T00:00:00.000Z"
              },
              "strategy": {
                "preferred_hosts": [
                  "doctor_518"
                ]
              }
            }
            """;

        const string mockResponse = """
            {
              "object": "scheduling.reassignment_preview",
              "items": [
                {
                  "booking": "book_01kd2m9a0b1c2d3e4f5g6h7j8m",
                  "event_type": "evtype_01kd2m9a0b1c2d3e4f5g6h7j8m",
                  "title": "Consultation",
                  "status": "confirmed",
                  "start": "2027-08-03T15:00:00.000Z",
                  "end": "2027-08-03T15:30:00.000Z",
                  "series": null,
                  "group_session": null,
                  "from_host": "host_01kd2m9a0b1c2d3e4f5g6h7j8m",
                  "to_host": "host_01kd2m9a0b1c2d3e4f5g6h7j8n",
                  "reason": null
                }
              ],
              "truncated": false
            }
            """;

        Server
            .Given(
                WireMock
                    .RequestBuilders.Request.Create()
                    .WithPath("/v1/scheduling/reassignments/preview")
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

        var response = await Client.Scheduling.Reassignments.PreviewAsync(
            new PreviewSchedulingReassignmentRequest
            {
                Selection = new SchedulingReassignmentSelection
                {
                    Host = "doctor_482",
                    StartBefore = "2027-08-14T00:00:00.000Z",
                },
                Strategy = new SchedulingReassignmentStrategy
                {
                    PreferredHosts = new List<string>() { "doctor_518" },
                },
            }
        );
        JsonAssert.AreEqual(response, mockResponse);
    }
}
