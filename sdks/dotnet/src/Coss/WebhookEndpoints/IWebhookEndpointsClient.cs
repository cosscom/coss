namespace Coss;

public partial interface IWebhookEndpointsClient
{
    public Coss.WebhookEndpoints.IDeliveriesClient Deliveries { get; }

    /// <summary>
    /// Every endpoint of the API key's environment, oldest first. Webhook endpoints belong to the API key's own environment: a `coss_test_…` key only ever sees sandbox endpoints, and a `coss_live_…` key only production ones.
    /// </summary>
    WithRawResponseTask<WebhookEndpointList> ListAsync(
        RequestOptions? options = null,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// Registers a URL that receives signed event notifications. Webhook endpoints belong to the API key's own environment: a `coss_test_…` key only ever sees sandbox endpoints, and a `coss_live_…` key only production ones. The response carries the signing secret, which is returned only here and when it is rolled: store it, and verify every delivery with it (`verifyWebhook` in the SDK).
    /// </summary>
    WithRawResponseTask<WebhookEndpointWithSecret> CreateAsync(
        CreateWebhookEndpointRequest request,
        RequestOptions? options = null,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// The endpoint without its signing secret, which is only returned when created or rolled.
    /// </summary>
    WithRawResponseTask<WebhookEndpoint> GetAsync(
        GetWebhookEndpointsRequest request,
        RequestOptions? options = null,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// Removes the endpoint and its delivery log. Deliveries already queued for it are dropped. To stop deliveries temporarily, set `enabled` to `false` instead.
    /// </summary>
    WithRawResponseTask<DeletedWebhookEndpoint> DeleteAsync(
        DeleteWebhookEndpointsRequest request,
        RequestOptions? options = null,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// Changes the URL, description, subscribed event types, API version or `enabled` flag. Omitted fields keep their current value, and the signing secret stays the same (see Roll a signing secret), so receivers keep verifying deliveries. Disabling an endpoint stops deliveries without losing its configuration.
    /// </summary>
    WithRawResponseTask<WebhookEndpoint> UpdateAsync(
        UpdateWebhookEndpointRequest request,
        RequestOptions? options = null,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// Replaces the endpoint's signing secret with a new one, returned in the response (the only time it is). Until `previous_secret_expires_at`, every delivery is signed with both secrets (`webhook-signature` lists two signatures), so receivers verifying with either one accept it: deploy the new secret, then let the old one expire. Rolling again in that time stops the older secret at once. Not idempotent: after a lost response, roll again.
    /// </summary>
    WithRawResponseTask<WebhookEndpointWithSecret> RollSecretAsync(
        RollWebhookEndpointSecretRequest request,
        RequestOptions? options = null,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// Queues the endpoint's deliveries that `failed` since `since` for one more attempt each, oldest first, spread over the next minute, e.g. after fixing a receiver that was down. At most 1000 per call: while `has_more` is `true`, call again with the same `since`. The endpoint must be enabled.
    /// </summary>
    WithRawResponseTask<WebhookEndpointRecovery> RecoverAsync(
        RecoverWebhookEndpointRequest request,
        RequestOptions? options = null,
        CancellationToken cancellationToken = default
    );
}
