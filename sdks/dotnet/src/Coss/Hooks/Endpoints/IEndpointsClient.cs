using Coss;

namespace Coss.Hooks;

public partial interface IEndpointsClient
{
    /// <summary>
    /// The application's endpoints, oldest first. Secrets are never included.
    /// </summary>
    WithRawResponseTask<HookEndpointList> ListAsync(
        ListEndpointsRequest request,
        RequestOptions? options = null,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// Registers a URL of the application's user that receives its messages, each request signed (Standard Webhooks) with the endpoint's own secret, returned here. Usually your users add endpoints themselves in the portal. Hooks resources belong to the API key's own environment: a `coss_test_…` key only ever sees sandbox ones, a `coss_live_…` key only production ones.
    /// </summary>
    WithRawResponseTask<HookEndpointWithSecret> CreateAsync(
        CreateHookEndpointRequest request,
        RequestOptions? options = null,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// An endpoint of the application.
    /// </summary>
    WithRawResponseTask<HookEndpoint> GetAsync(
        GetEndpointsRequest request,
        RequestOptions? options = null,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// Deletes the endpoint; its pending deliveries fail. Its delivery log stays.
    /// </summary>
    WithRawResponseTask<DeletedHookEndpoint> DeleteAsync(
        DeleteEndpointsRequest request,
        RequestOptions? options = null,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// Changes the URL, description, filter types, rate limit, metadata or `enabled`. Enabling it again clears a failure streak. The secret stays the same (see roll secret).
    /// </summary>
    WithRawResponseTask<HookEndpoint> UpdateAsync(
        UpdateHookEndpointRequest request,
        RequestOptions? options = null,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// The endpoint's current signing secret, e.g. to show its user. Needs `hook:update`, like rolling it.
    /// </summary>
    WithRawResponseTask<HookEndpointSecret> GetSecretAsync(
        GetSecretEndpointsRequest request,
        RequestOptions? options = null,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// Replaces the signing secret, returned here. Until `previous_secret_expires_at`, requests carry a signature with each secret, so the receiver can switch without rejecting any. Not idempotent.
    /// </summary>
    WithRawResponseTask<HookEndpointWithSecret> RollSecretAsync(
        RollHookEndpointSecretRequest request,
        RequestOptions? options = null,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// Queues every delivery to the endpoint that failed, of messages sent since `since`, for one more attempt each, e.g. after its receiver was down. coss.com works through them in the background (oldest first); follow `status` with the returned recovery. The endpoint must be enabled.
    /// </summary>
    WithRawResponseTask<HookEndpointRecovery> RecoverAsync(
        RecoverHookEndpointRequest request,
        RequestOptions? options = null,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// A recovery of the endpoint: `pending` while deliveries are still being requeued.
    /// </summary>
    WithRawResponseTask<HookEndpointRecovery> GetRecoveryAsync(
        GetRecoveryEndpointsRequest request,
        RequestOptions? options = null,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// Sends a message to this endpoint only (whatever its filter), with the given payload or the event type's first example. It counts against the send quota like any message.
    /// </summary>
    WithRawResponseTask<HookMessage> SendTestAsync(
        SendHookTestRequest request,
        RequestOptions? options = null,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// The endpoint's deliveries, newest first.
    /// </summary>
    WithRawResponseTask<HookDeliveryList> ListDeliveriesAsync(
        ListDeliveriesEndpointsRequest request,
        RequestOptions? options = null,
        CancellationToken cancellationToken = default
    );
}
