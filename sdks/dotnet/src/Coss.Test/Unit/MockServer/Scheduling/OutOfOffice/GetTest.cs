using Coss.Scheduling;
using Coss.Test.Unit.MockServer;
using Coss.Test.Utils;
using NUnit.Framework;

namespace Coss.Test.Unit.MockServer.Scheduling.OutOfOffice;

[TestFixture]
[Parallelizable(ParallelScope.Self)]
public class GetTest : BaseMockServerTest
{
    [NUnit.Framework.Test]
    public async Task MockServerTest_1()
    {
        const string mockResponse = """
            {
              "object": "scheduling.out_of_office",
              "id": "id",
              "host": "host",
              "start": "start",
              "end": "end",
              "all_day": {
                "start_date": "start_date",
                "end_date": "end_date",
                "time_zone": "time_zone"
              },
              "reason": "reason",
              "notes": "notes",
              "public_message": "public_message",
              "show_on_calendar": true,
              "delegates": [
                "delegates",
                "delegates"
              ],
              "existing_bookings": "leave",
              "external_id": "external_id",
              "group": "group",
              "source": "api",
              "created_at": "created_at",
              "updated_at": "updated_at"
            }
            """;

        Server
            .Given(
                WireMock
                    .RequestBuilders.Request.Create()
                    .WithPath("/v1/scheduling/out_of_office/id")
                    .UsingGet()
            )
            .RespondWith(
                WireMock
                    .ResponseBuilders.Response.Create()
                    .WithStatusCode(200)
                    .WithBody(mockResponse)
            );

        var response = await Client.Scheduling.OutOfOffice.GetAsync(
            new GetOutOfOfficeRequest { Id = "id" }
        );
        JsonAssert.AreEqual(response, mockResponse);
    }

    [NUnit.Framework.Test]
    public async Task MockServerTest_2()
    {
        const string mockResponse = """
            {
              "object": "scheduling.out_of_office",
              "id": "ooo_01kd2m9a0b1c2d3e4f5g6h7j8m",
              "host": "host_01kd2m9a0b1c2d3e4f5g6h7j8m",
              "start": "2027-08-02T04:00:00.000Z",
              "end": "2027-08-14T04:00:00.000Z",
              "all_day": {
                "start_date": "2027-08-02",
                "end_date": "2027-08-13",
                "time_zone": "America/New_York"
              },
              "reason": "vacation",
              "notes": null,
              "public_message": "Back on the 16th.",
              "show_on_calendar": true,
              "delegates": [
                "host_01kd2m9a0b1c2d3e4f5g6h7j8n"
              ],
              "existing_bookings": "leave",
              "external_id": null,
              "group": null,
              "source": "api",
              "created_at": "2027-01-01T10:00:00.000Z",
              "updated_at": "2027-01-01T10:00:00.000Z"
            }
            """;

        Server
            .Given(
                WireMock
                    .RequestBuilders.Request.Create()
                    .WithPath("/v1/scheduling/out_of_office/ooo_01kd2m9a0b1c2d3e4f5g6h7j8m")
                    .UsingGet()
            )
            .RespondWith(
                WireMock
                    .ResponseBuilders.Response.Create()
                    .WithStatusCode(200)
                    .WithBody(mockResponse)
            );

        var response = await Client.Scheduling.OutOfOffice.GetAsync(
            new GetOutOfOfficeRequest { Id = "ooo_01kd2m9a0b1c2d3e4f5g6h7j8m" }
        );
        JsonAssert.AreEqual(response, mockResponse);
    }
}
