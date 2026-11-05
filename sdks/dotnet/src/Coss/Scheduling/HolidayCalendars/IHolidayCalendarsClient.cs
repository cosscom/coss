using Coss;

namespace Coss.Scheduling;

public partial interface IHolidayCalendarsClient
{
    /// <summary>
    /// By name. A feed's URL is never shown again.
    /// </summary>
    WithRawResponseTask<SchedulingHolidayCalendarList> ListAsync(
        RequestOptions? options = null,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// Applies a country's public holidays, or your own feed, to some hosts as ordinary out of office entries, kept up to date by coss.com. A host who removes one keeps it removed.
    /// </summary>
    WithRawResponseTask<SchedulingHolidayCalendar> CreateAsync(
        CreateSchedulingHolidayCalendarRequest request,
        RequestOptions? options = null,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// With when it was last read, and why not if it couldn't be.
    /// </summary>
    WithRawResponseTask<SchedulingHolidayCalendar> GetAsync(
        GetHolidayCalendarsRequest request,
        RequestOptions? options = null,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// Hosts can be booked on its days again, shortly: past entries stay.
    /// </summary>
    WithRawResponseTask<DeletedSchedulingHolidayCalendar> RemoveAsync(
        RemoveHolidayCalendarsRequest request,
        RequestOptions? options = null,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// Who it applies to, who covers and what happens to bookings. Takes effect shortly.
    /// </summary>
    WithRawResponseTask<SchedulingHolidayCalendar> UpdateAsync(
        UpdateSchedulingHolidayCalendarRequest request,
        RequestOptions? options = null,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// What's coming, with names, as last read. Empty until its first read.
    /// </summary>
    WithRawResponseTask<SchedulingHolidayList> HolidaysAsync(
        HolidaysHolidayCalendarsRequest request,
        RequestOptions? options = null,
        CancellationToken cancellationToken = default
    );
}
