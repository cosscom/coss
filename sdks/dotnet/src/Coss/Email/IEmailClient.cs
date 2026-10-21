using Coss.Email;

namespace Coss;

public partial interface IEmailClient
{
    public ITemplatesClient Templates { get; }
    public IDedicatedIpsClient DedicatedIps { get; }
    public ISuppressionsClient Suppressions { get; }
    public Coss.Email.ITrackingClient Tracking { get; }
    public IContactsClient Contacts { get; }
    public IBroadcastsClient Broadcasts { get; }
    public IAudiencesClient Audiences { get; }
    public ISegmentsClient Segments { get; }
    public ITopicsClient Topics { get; }
    public IMarketingSettingsClient MarketingSettings { get; }
    public IReceivedClient Received { get; }

    /// <summary>
    /// Emails sent from the API key's environment, newest first, without their content (retrieve an email for `html`, `text`, `headers` and `attachments`). Filter by recipient (`to`), by the email's or a recipient's status, by category, batch or creation time. Pass the last `id` as `after` to get the next page while `has_more` is true.
    /// </summary>
    WithRawResponseTask<EmailSummaryList> ListAsync(
        ListEmailRequest request,
        RequestOptions? options = null,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// Queues an email from the API key's environment and returns it with `status: "queued"`; it is handed to the delivery provider moments later. Follow it with `GET /v1/emails/{id}` or the `email.sent` / `email.failed` webhooks. Live (`coss_live_…`) keys must send from a verified domain of the organization. Sandbox (`coss_test_…`) keys accept any `from` and never deliver anything; the response has `sandbox: true`. Recipients on the environment's suppression list (for every email, or for the email's `category`) are skipped and get the status `suppressed`. With a future `scheduled_at` the email is stored with the status `scheduled` and sent at that time; the domain and the suppression list are checked again then. Attachments are base64-encoded; only metadata is kept after sending. Recipients count against the organization's send quota (per second and per day; sandbox environments have their own daily quota). With open or click tracking on (the environment's settings, or `tracking`), the HTML body is delivered with a tracking pixel and/or links rewritten to coss.com redirects; the stored `html` stays as sent.
    /// </summary>
    WithRawResponseTask<EmailMessage> SendAsync(
        SendEmailBody request,
        RequestOptions? options = null,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// Queues up to 100 emails in one request. Each email is handled exactly as by `POST /v1/emails` (sender checks, suppressions, scheduling, attachments, tracking), but the batch is all or nothing: if any email is invalid, or any `from` is not a verified domain (live keys), nothing is stored and the error names the email (e.g. `emails.3.to`). One `Idempotency-Key` covers the whole batch. The emails' recipients are charged against the send quota together, so a batch with more recipients than the quota allows at once is refused (`quota_exceeded` without `Retry-After`): split it. The request body shares the 40 MB limit of a single send.
    /// </summary>
    WithRawResponseTask<EmailBatch> SendBatchAsync(
        SendEmailBatchRequest request,
        RequestOptions? options = null,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// A batch sent with `POST /v1/emails/batch`, with its emails' current statuses in the order of the request. Emails past the data retention period are left out. Only batches sent from the API key's own environment can be retrieved.
    /// </summary>
    WithRawResponseTask<EmailBatch> GetBatchAsync(
        GetBatchEmailRequest request,
        RequestOptions? options = null,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// Only emails sent from the API key's own environment can be retrieved.
    /// </summary>
    WithRawResponseTask<EmailMessage> GetAsync(
        GetEmailRequest request,
        RequestOptions? options = null,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// Cancels an email sent with a future `scheduled_at` before it is sent. Canceling an already canceled email returns it unchanged. To send it at another time, reschedule it instead.
    /// </summary>
    WithRawResponseTask<EmailMessage> CancelAsync(
        CancelEmailRequest request,
        RequestOptions? options = null,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// Moves an email sent with a future `scheduled_at` to a new time, at most 30 days from now, and records an `email.rescheduled` event. A time that is not in the future sends it within seconds. Rescheduling to the time it already has returns it unchanged. The domain and the suppression list are still checked when it is sent.
    /// </summary>
    WithRawResponseTask<EmailMessage> RescheduleAsync(
        RescheduleEmailRequest request,
        RequestOptions? options = null,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// Every delivery event of the email, oldest first: `email.scheduled`, `email.rescheduled`, `email.canceled`, `email.sent` and `email.failed` for the whole email, and `email.delivered`, `email.delivery_delayed`, `email.bounced`, `email.complained` and `email.suppressed` (skipped because of the suppression list) per recipient, plus `email.opened` and `email.clicked` when tracking is on (attributed to a recipient only when the email had a single one) and `email.unsubscribed` after a one-click unsubscribe.
    /// </summary>
    WithRawResponseTask<EmailEventList> ListEventsAsync(
        ListEventsEmailRequest request,
        RequestOptions? options = null,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// The links coss.com rewrote for click tracking, in the order they appear in the HTML, with their click counts. Empty unless the email was sent with click tracking.
    /// </summary>
    WithRawResponseTask<EmailLinkList> ListLinksAsync(
        ListLinksEmailRequest request,
        RequestOptions? options = null,
        CancellationToken cancellationToken = default
    );
}
