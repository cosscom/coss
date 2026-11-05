using Coss.Scheduling;
using Coss.Test.Unit.MockServer;
using Coss.Test.Utils;
using NUnit.Framework;
using OneOf;

namespace Coss.Test.Unit.MockServer.Scheduling.HolidayCalendars;

[TestFixture]
[Parallelizable(ParallelScope.Self)]
public class UpdateTest : BaseMockServerTest
{
    [NUnit.Framework.Test]
    public async Task MockServerTest_1()
    {
        const string requestJson = """
            {}
            """;

        const string mockResponse = """
            {
              "object": "scheduling.holiday_calendar",
              "id": "id",
              "name": "name",
              "source": "country",
              "country": "country",
              "hosts": [
                "hosts",
                "hosts"
              ],
              "host_filter": {
                "host_filter": "host_filter"
              },
              "regions": [
                "regions",
                "regions"
              ],
              "delegates": [
                "delegates",
                "delegates"
              ],
              "existing_bookings": "leave",
              "last_read_at": "last_read_at",
              "last_error": "last_error",
              "created_at": "created_at",
              "updated_at": "updated_at"
            }
            """;

        Server
            .Given(
                WireMock
                    .RequestBuilders.Request.Create()
                    .WithPath("/v1/scheduling/holiday_calendars/id")
                    .WithHeader("Content-Type", "application/json")
                    .UsingPatch()
                    .WithBodyAsJson(requestJson)
            )
            .RespondWith(
                WireMock
                    .ResponseBuilders.Response.Create()
                    .WithStatusCode(200)
                    .WithBody(mockResponse)
            );

        var response = await Client.Scheduling.HolidayCalendars.UpdateAsync(
            new UpdateSchedulingHolidayCalendarRequest
            {
                Id = "id",
                Name = null,
                Hosts = null,
                HostFilter = null,
                Regions = null,
                Delegates = null,
                ExistingBookings = null,
            }
        );
        JsonAssert.AreEqual(response, mockResponse);
    }

    [NUnit.Framework.Test]
    public async Task MockServerTest_2()
    {
        const string requestJson = """
            {
              "host_filter": {
                "team": "london"
              }
            }
            """;

        const string mockResponse = """
            {
              "object": "scheduling.holiday_calendar",
              "id": "hcal_01kd2m9a0b1c2d3e4f5g6h7j8m",
              "name": "UK team",
              "source": "country",
              "country": "GB",
              "hosts": null,
              "host_filter": {
                "team": "london"
              },
              "regions": [
                "England"
              ],
              "delegates": [
                "delegates"
              ],
              "existing_bookings": "leave",
              "last_read_at": "2027-01-01T10:00:00.000Z",
              "last_error": null,
              "created_at": "2027-01-01T10:00:00.000Z",
              "updated_at": "2027-01-01T10:00:00.000Z"
            }
            """;

        Server
            .Given(
                WireMock
                    .RequestBuilders.Request.Create()
                    .WithPath("/v1/scheduling/holiday_calendars/id")
                    .WithHeader("Content-Type", "application/json")
                    .UsingPatch()
                    .WithBodyAsJson(requestJson)
            )
            .RespondWith(
                WireMock
                    .ResponseBuilders.Response.Create()
                    .WithStatusCode(200)
                    .WithBody(mockResponse)
            );

        var response = await Client.Scheduling.HolidayCalendars.UpdateAsync(
            new UpdateSchedulingHolidayCalendarRequest
            {
                Id = "id",
                HostFilter = new Dictionary<string, OneOf<string, IEnumerable<string>>>()
                {
                    { "team", "london" },
                },
            }
        );
        JsonAssert.AreEqual(response, mockResponse);
    }
}
