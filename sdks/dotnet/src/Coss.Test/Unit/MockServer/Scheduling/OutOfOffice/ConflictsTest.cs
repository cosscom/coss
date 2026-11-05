using Coss.Scheduling;
using Coss.Test.Unit.MockServer;
using Coss.Test.Utils;
using NUnit.Framework;

namespace Coss.Test.Unit.MockServer.Scheduling.OutOfOffice;

[TestFixture]
[Parallelizable(ParallelScope.Self)]
public class ConflictsTest : BaseMockServerTest
{
    [NUnit.Framework.Test]
    public async Task MockServerTest_1()
    {
        const string mockResponse = """
            {
              "object": "list",
              "data": [
                {
                  "object": "scheduling.out_of_office_conflict",
                  "booking": "booking",
                  "event_type": "event_type",
                  "title": "title",
                  "status": "held",
                  "start": "start",
                  "end": "end",
                  "series": "series",
                  "group_session": "group_session"
                },
                {
                  "object": "scheduling.out_of_office_conflict",
                  "booking": "booking",
                  "event_type": "event_type",
                  "title": "title",
                  "status": "held",
                  "start": "start",
                  "end": "end",
                  "series": "series",
                  "group_session": "group_session"
                }
              ],
              "has_more": true
            }
            """;

        Server
            .Given(
                WireMock
                    .RequestBuilders.Request.Create()
                    .WithPath("/v1/scheduling/out_of_office/id/conflicts")
                    .UsingGet()
            )
            .RespondWith(
                WireMock
                    .ResponseBuilders.Response.Create()
                    .WithStatusCode(200)
                    .WithBody(mockResponse)
            );

        var response = await Client.Scheduling.OutOfOffice.ConflictsAsync(
            new ConflictsOutOfOfficeRequest { Id = "id" }
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
                  "object": "scheduling.out_of_office_conflict",
                  "booking": "book_01kd2m9a0b1c2d3e4f5g6h7j8m",
                  "event_type": "evtype_01kd2m9a0b1c2d3e4f5g6h7j8m",
                  "title": "Consultation",
                  "status": "confirmed",
                  "start": "2027-08-03T15:00:00.000Z",
                  "end": "2027-08-03T15:30:00.000Z",
                  "series": null,
                  "group_session": null
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
                        "/v1/scheduling/out_of_office/ooo_01kd2m9a0b1c2d3e4f5g6h7j8m/conflicts"
                    )
                    .UsingGet()
            )
            .RespondWith(
                WireMock
                    .ResponseBuilders.Response.Create()
                    .WithStatusCode(200)
                    .WithBody(mockResponse)
            );

        var response = await Client.Scheduling.OutOfOffice.ConflictsAsync(
            new ConflictsOutOfOfficeRequest { Id = "ooo_01kd2m9a0b1c2d3e4f5g6h7j8m" }
        );
        JsonAssert.AreEqual(response, mockResponse);
    }
}
