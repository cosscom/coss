using Coss;

namespace Coss.WebhookEndpoints;

public partial interface IDeliveriesClient
{
    /// <summary>
    /// The endpoint's delivery log, newest first: one delivery per event sent to it, with every HTTP attempt and the payload as sent. Pass the last `id` as `after` to get the next page while `has_more` is true. Deleting the endpoint deletes its log.
    /// </summary>
    WithRawResponseTask<WebhookDeliveryList> ListAsync(
        ListDeliveriesRequest request,
        RequestOptions? options = null,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// One delivery of the endpoint, with every HTTP attempt and the payload as sent.
    /// </summary>
    WithRawResponseTask<WebhookDelivery> GetAsync(
        GetDeliveriesRequest request,
        RequestOptions? options = null,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// Queues a finished delivery (`succeeded` or `failed`) for one more attempt, made within seconds, signed with the endpoint's current secret and sent to its current URL. A delivery that is still `pending` is returned unchanged: it is already scheduled for `next_attempt_at` (automatic retries stop after 8 attempts).
    /// </summary>
    WithRawResponseTask<WebhookDelivery> RetryAsync(
        RetryDeliveriesRequest request,
        RequestOptions? options = null,
        CancellationToken cancellationToken = default
    );
}
