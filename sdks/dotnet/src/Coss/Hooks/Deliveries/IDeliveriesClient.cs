using Coss;

namespace Coss.Hooks;

public partial interface IDeliveriesClient
{
    /// <summary>
    /// One message's delivery to one endpoint.
    /// </summary>
    WithRawResponseTask<HookDelivery> GetAsync(
        GetDeliveriesRequest request,
        RequestOptions? options = null,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// Every HTTP request of the delivery, oldest first, with response excerpts.
    /// </summary>
    WithRawResponseTask<HookAttemptList> ListAttemptsAsync(
        ListAttemptsDeliveriesRequest request,
        RequestOptions? options = null,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// Queues a finished delivery for one more attempt within seconds, to the endpoint's current URL and secret. A `pending` delivery is returned unchanged.
    /// </summary>
    WithRawResponseTask<HookDelivery> RetryAsync(
        RetryDeliveriesRequest request,
        RequestOptions? options = null,
        CancellationToken cancellationToken = default
    );
}
