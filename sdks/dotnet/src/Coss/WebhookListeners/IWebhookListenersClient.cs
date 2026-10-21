namespace Coss;

public partial interface IWebhookListenersClient
{
    /// <summary>
    /// Listeners are how `coss listen` forwards events to a local server: coss.com can't reach `localhost`, so the CLI pulls them. They belong to the API key's environment, receive events created after they open, and don't count toward the plan's webhook endpoints. A listener closes when it is deleted or after 10 minutes without a poll; an environment has at most 5 open at once. Events reach it unsigned: the CLI signs what it forwards with its own secret.
    /// </summary>
    WithRawResponseTask<WebhookListener> CreateAsync(
        CreateWebhookListenerRequest request,
        RequestOptions? options = null,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// Acknowledges deliveries handed out earlier, keeps the listener open for another 10 minutes, and waits up to `wait_ms` (at most 25 s) for events. Deliveries come oldest first; one not acknowledged within two minutes is handed out again (with the same `event_id`). The answer may come early, with no deliveries, when the API restarts: poll again. Polls are not request-logged; each acknowledgement is logged as a `webhook.forward` line.
    /// </summary>
    WithRawResponseTask<WebhookListenerPoll> PollAsync(
        PollWebhookListenerRequest request,
        RequestOptions? options = null,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// Closes the listener: it receives nothing more, and deliveries it was still holding are dropped. `coss listen` closes its listener when it exits.
    /// </summary>
    WithRawResponseTask<DeletedWebhookListener> DeleteAsync(
        DeleteWebhookListenersRequest request,
        RequestOptions? options = null,
        CancellationToken cancellationToken = default
    );
}
