namespace Coss;

public partial interface IWebhookEventsClient
{
    /// <summary>
    /// Sends a sample event of a type to the environment's enabled endpoints subscribed to it and its open listeners (`coss listen`), exactly as a real one is sent: same body, signature, retries and log lines. `coss trigger` calls it. Sandbox environments only. The ids in the sample are made up (pass real ones in `data` for a handler that looks them up), and nothing marks the event as a test: your handler takes it like the real thing. When nothing is subscribed, the event goes nowhere and isn't kept.
    /// </summary>
    WithRawResponseTask<WebhookTestEvent> TestAsync(
        CreateTestWebhookEventRequest request,
        RequestOptions? options = null,
        CancellationToken cancellationToken = default
    );
}
