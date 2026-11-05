using Coss.Scheduling;
using Coss.Test.Unit.MockServer;
using Coss.Test.Utils;
using NUnit.Framework;

namespace Coss.Test.Unit.MockServer.Scheduling.HolidayCalendars;

[TestFixture]
[Parallelizable(ParallelScope.Self)]
public class HolidaysTest : BaseMockServerTest
{
    [NUnit.Framework.Test]
    public async Task MockServerTest_1()
    {
        const string mockResponse = """
            {
              "object": "list",
              "data": [
                {
                  "date": "date",
                  "name": "name",
                  "region": "region"
                },
                {
                  "date": "date",
                  "name": "name",
                  "region": "region"
                }
              ],
              "has_more": true
            }
            """;

        Server
            .Given(
                WireMock
                    .RequestBuilders.Request.Create()
                    .WithPath("/v1/scheduling/holiday_calendars/id/holidays")
                    .UsingGet()
            )
            .RespondWith(
                WireMock
                    .ResponseBuilders.Response.Create()
                    .WithStatusCode(200)
                    .WithBody(mockResponse)
            );

        var response = await Client.Scheduling.HolidayCalendars.HolidaysAsync(
            new HolidaysHolidayCalendarsRequest { Id = "id" }
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
                  "date": "2027-12-25",
                  "name": "Christmas Day",
                  "region": null
                }
              ],
              "has_more": false
            }
            """;

        Server
            .Given(
                WireMock
                    .RequestBuilders.Request.Create()
                    .WithPath("/v1/scheduling/holiday_calendars/id/holidays")
                    .UsingGet()
            )
            .RespondWith(
                WireMock
                    .ResponseBuilders.Response.Create()
                    .WithStatusCode(200)
                    .WithBody(mockResponse)
            );

        var response = await Client.Scheduling.HolidayCalendars.HolidaysAsync(
            new HolidaysHolidayCalendarsRequest { Id = "id" }
        );
        JsonAssert.AreEqual(response, mockResponse);
    }
}
