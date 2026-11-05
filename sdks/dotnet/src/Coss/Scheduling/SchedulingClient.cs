using Coss.Core;

namespace Coss.Scheduling;

public partial class SchedulingClient : ISchedulingClient
{
    private readonly RawClient _client;

    internal SchedulingClient(RawClient client)
    {
        _client = client;
        Hosts = new HostsClient(_client);
        Bookings = new BookingsClient(_client);
        Reassignments = new ReassignmentsClient(_client);
        HolidayCalendars = new HolidayCalendarsClient(_client);
        OutOfOffice = new OutOfOfficeClient(_client);
        Schedules = new SchedulesClient(_client);
        EventTypes = new EventTypesClient(_client);
        Slots = new SlotsClient(_client);
        Availability = new AvailabilityClient(_client);
        Holds = new HoldsClient(_client);
        Series = new SeriesClient(_client);
        Attendees = new AttendeesClient(_client);
        Calendars = new CalendarsClient(_client);
        CalendarDelegations = new CalendarDelegationsClient(_client);
        OauthApps = new OauthAppsClient(_client);
        Sessions = new SessionsClient(_client);
        Settings = new SettingsClient(_client);
    }

    public IHostsClient Hosts { get; }

    public IBookingsClient Bookings { get; }

    public IReassignmentsClient Reassignments { get; }

    public IHolidayCalendarsClient HolidayCalendars { get; }

    public IOutOfOfficeClient OutOfOffice { get; }

    public ISchedulesClient Schedules { get; }

    public IEventTypesClient EventTypes { get; }

    public ISlotsClient Slots { get; }

    public IAvailabilityClient Availability { get; }

    public IHoldsClient Holds { get; }

    public ISeriesClient Series { get; }

    public IAttendeesClient Attendees { get; }

    public ICalendarsClient Calendars { get; }

    public ICalendarDelegationsClient CalendarDelegations { get; }

    public IOauthAppsClient OauthApps { get; }

    public ISessionsClient Sessions { get; }

    public ISettingsClient Settings { get; }
}
