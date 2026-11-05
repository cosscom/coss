using Coss;

namespace Coss.Scheduling;

public partial interface IOutOfOfficeClient
{
    /// <summary>
    /// The environment's entries, newest first.
    /// </summary>
    WithRawResponseTask<SchedulingOutOfOfficeList> ListAsync(
        ListOutOfOfficeRequest request,
        RequestOptions? options = null,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// Marks one host, a list of hosts or everyone matching some attributes as away, for part of a day or for whole dates. They aren't offered during it. Existing bookings stay as they are: list them with the entry's conflicts.
    /// </summary>
    WithRawResponseTask<SchedulingOutOfOfficeList> CreateAsync(
        CreateSchedulingOutOfOfficeRequest request,
        RequestOptions? options = null,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// One entry.
    /// </summary>
    WithRawResponseTask<SchedulingOutOfOffice> GetAsync(
        GetOutOfOfficeRequest request,
        RequestOptions? options = null,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// The host can be booked in that time again, and any calendar event for it goes.
    /// </summary>
    WithRawResponseTask<DeletedSchedulingOutOfOffice> RemoveAsync(
        RemoveOutOfOfficeRequest request,
        RequestOptions? options = null,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// Changes what's given. An entry stays with its host.
    /// </summary>
    WithRawResponseTask<SchedulingOutOfOffice> UpdateAsync(
        UpdateSchedulingOutOfOfficeRequest request,
        RequestOptions? options = null,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// For syncing from a system of record such as an HR tool: send what it says, as often as you like, and there's one entry for it. Give every field you want to keep.
    /// </summary>
    WithRawResponseTask<SchedulingOutOfOffice> PutAsync(
        PutSchedulingOutOfOfficeRequest request,
        RequestOptions? options = null,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// Live bookings of the host that fall in the entry, soonest first. Entries never change them.
    /// </summary>
    WithRawResponseTask<SchedulingOutOfOfficeConflictList> ConflictsAsync(
        ConflictsOutOfOfficeRequest request,
        RequestOptions? options = null,
        CancellationToken cancellationToken = default
    );
}
