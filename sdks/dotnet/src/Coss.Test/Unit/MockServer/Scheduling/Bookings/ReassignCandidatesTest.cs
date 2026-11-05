using Coss.Scheduling;
using Coss.Test.Unit.MockServer;
using Coss.Test.Utils;
using NUnit.Framework;

namespace Coss.Test.Unit.MockServer.Scheduling.Bookings;

[TestFixture]
[Parallelizable(ParallelScope.Self)]
public class ReassignCandidatesTest : BaseMockServerTest
{
    [NUnit.Framework.Test]
    public async Task MockServerTest_1()
    {
        const string mockResponse = """
            {
              "object": "list",
              "data": [
                {
                  "object": "scheduling.reassign_candidate",
                  "host": "host",
                  "uid": "uid",
                  "name": "name",
                  "member": true,
                  "available": true,
                  "reason": "reason",
                  "reasons": [
                    "reasons",
                    "reasons"
                  ],
                  "load": 1.1,
                  "rank": 1.1,
                  "meeting_provider_missing": true
                },
                {
                  "object": "scheduling.reassign_candidate",
                  "host": "host",
                  "uid": "uid",
                  "name": "name",
                  "member": true,
                  "available": true,
                  "reason": "reason",
                  "reasons": [
                    "reasons",
                    "reasons"
                  ],
                  "load": 1.1,
                  "rank": 1.1,
                  "meeting_provider_missing": true
                }
              ],
              "has_more": true
            }
            """;

        Server
            .Given(
                WireMock
                    .RequestBuilders.Request.Create()
                    .WithPath("/v1/scheduling/bookings/id/reassign_candidates")
                    .UsingGet()
            )
            .RespondWith(
                WireMock
                    .ResponseBuilders.Response.Create()
                    .WithStatusCode(200)
                    .WithBody(mockResponse)
            );

        var response = await Client.Scheduling.Bookings.ReassignCandidatesAsync(
            new ReassignCandidatesBookingsRequest { Id = "id" }
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
                  "object": "scheduling.reassign_candidate",
                  "host": "host_01kd2m9a0b1c2d3e4f5g6h7j8m",
                  "uid": "doctor_518",
                  "name": "Dr. Priya Raman",
                  "member": true,
                  "available": true,
                  "reason": null,
                  "reasons": [
                    "reasons"
                  ],
                  "load": 4,
                  "rank": 1,
                  "meeting_provider_missing": false
                }
              ],
              "has_more": false
            }
            """;

        Server
            .Given(
                WireMock
                    .RequestBuilders.Request.Create()
                    .WithPath(
                        "/v1/scheduling/bookings/book_01kd2m9a0b1c2d3e4f5g6h7j8m/reassign_candidates"
                    )
                    .UsingGet()
            )
            .RespondWith(
                WireMock
                    .ResponseBuilders.Response.Create()
                    .WithStatusCode(200)
                    .WithBody(mockResponse)
            );

        var response = await Client.Scheduling.Bookings.ReassignCandidatesAsync(
            new ReassignCandidatesBookingsRequest { Id = "book_01kd2m9a0b1c2d3e4f5g6h7j8m" }
        );
        JsonAssert.AreEqual(response, mockResponse);
    }
}
