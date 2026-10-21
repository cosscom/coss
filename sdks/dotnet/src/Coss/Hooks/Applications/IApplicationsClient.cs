using Coss;

namespace Coss.Hooks;

public partial interface IApplicationsClient
{
    /// <summary>
    /// The environment's applications, newest first. Hooks resources belong to the API key's own environment: a `coss_test_…` key only ever sees sandbox ones, a `coss_live_…` key only production ones.
    /// </summary>
    WithRawResponseTask<HookApplicationList> ListAsync(
        ListApplicationsRequest request,
        RequestOptions? options = null,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// Creates an application: one of your customers (or users), who gets their own endpoints and portal. Give it a `uid` (e.g. your customer's id) to address it by in every path. Hooks resources belong to the API key's own environment: a `coss_test_…` key only ever sees sandbox ones, a `coss_live_…` key only production ones.
    /// </summary>
    WithRawResponseTask<HookApplication> CreateAsync(
        CreateHookApplicationRequest request,
        RequestOptions? options = null,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// An application of the API key's environment, by its id or uid.
    /// </summary>
    WithRawResponseTask<HookApplication> GetAsync(
        GetApplicationsRequest request,
        RequestOptions? options = null,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// Deletes the application with its endpoints and portal sessions; pending deliveries stop. Its messages are no longer reachable and are deleted with the rest of their day's data.
    /// </summary>
    WithRawResponseTask<DeletedHookApplication> DeleteAsync(
        DeleteApplicationsRequest request,
        RequestOptions? options = null,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// Changes the name, uid or metadata. Fields left out keep their value.
    /// </summary>
    WithRawResponseTask<HookApplication> UpdateAsync(
        UpdateHookApplicationRequest request,
        RequestOptions? options = null,
        CancellationToken cancellationToken = default
    );
}
