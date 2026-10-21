using Coss;

namespace Coss.Hooks;

public partial interface IEventTypesClient
{
    /// <summary>
    /// The environment's event types by name; archived ones only with `include_archived`.
    /// </summary>
    WithRawResponseTask<HookEventTypeList> ListAsync(
        ListEventTypesRequest request,
        RequestOptions? options = null,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// Adds a type to the catalog your applications' users subscribe from (in the portal, or the `filter_types` of an endpoint), with a description, a JSON Schema and examples to show them. Messages can be sent with any type, registered or not. Hooks resources belong to the API key's own environment: a `coss_test_…` key only ever sees sandbox ones, a `coss_live_…` key only production ones.
    /// </summary>
    WithRawResponseTask<HookEventType> CreateAsync(
        CreateHookEventTypeRequest request,
        RequestOptions? options = null,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// An event type of the API key's environment, archived or not.
    /// </summary>
    WithRawResponseTask<HookEventType> GetAsync(
        GetEventTypesRequest request,
        RequestOptions? options = null,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// Hides the type from the portal and from new subscriptions. Endpoints already subscribed keep receiving it. Restore it with `PATCH … { archived: false }`.
    /// </summary>
    WithRawResponseTask<HookEventType> ArchiveAsync(
        ArchiveEventTypesRequest request,
        RequestOptions? options = null,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// Changes its description, schema or examples, or archives or restores it.
    /// </summary>
    WithRawResponseTask<HookEventType> UpdateAsync(
        UpdateHookEventTypeRequest request,
        RequestOptions? options = null,
        CancellationToken cancellationToken = default
    );
}
