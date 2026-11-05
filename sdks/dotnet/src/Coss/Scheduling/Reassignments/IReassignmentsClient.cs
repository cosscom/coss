using Coss;

namespace Coss.Scheduling;

public partial interface IReassignmentsClient
{
    /// <summary>
    /// Who each booking would go to, and why not when nobody can take it, without moving anything. It works down them in order, so two can't both be promised the same free hour. Change any of it and start the run with `assignments`. Covers the first 500. Things can change before you start it: the run decides again.
    /// </summary>
    WithRawResponseTask<SchedulingReassignmentPreview> PreviewAsync(
        PreviewSchedulingReassignmentRequest request,
        RequestOptions? options = null,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// Newest first, with how each is going.
    /// </summary>
    WithRawResponseTask<SchedulingReassignmentList> ListAsync(
        ListReassignmentsRequest request,
        RequestOptions? options = null,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// Moves up to 5,000 bookings in the background, each on its own, so one that can't move never holds up the rest. Nothing's ever cancelled: a booking nobody can take stays where it is, and its item says so. It answers at once: follow the run by its id, or wait for `scheduling.reassignment.completed`.
    /// </summary>
    WithRawResponseTask<SchedulingReassignment> CreateAsync(
        CreateSchedulingReassignmentRequest request,
        RequestOptions? options = null,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// How it's going.
    /// </summary>
    WithRawResponseTask<SchedulingReassignment> GetAsync(
        GetReassignmentsRequest request,
        RequestOptions? options = null,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// Each booking it covers and what happened to it. A group session has one, for one of its seats. Empty until the worker's started on it.
    /// </summary>
    WithRawResponseTask<SchedulingReassignmentItemList> ItemsAsync(
        ItemsReassignmentsRequest request,
        RequestOptions? options = null,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// Stops what hasn't happened yet. What's moved stays moved: undo it for that. Cancelling one that's finished changes nothing.
    /// </summary>
    WithRawResponseTask<SchedulingReassignment> CancelAsync(
        CancelReassignmentsRequest request,
        RequestOptions? options = null,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// Gives back what a finished run moved, as a new run. A booking that's moved on since stays where it went, and a former host who's no longer free keeps it from going back, unless you pass `overrides`.
    /// </summary>
    WithRawResponseTask<SchedulingReassignment> UndoAsync(
        UndoSchedulingReassignmentRequest request,
        RequestOptions? options = null,
        CancellationToken cancellationToken = default
    );
}
