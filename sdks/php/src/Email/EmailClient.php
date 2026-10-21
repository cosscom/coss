<?php

namespace Coss\Email;

use Coss\Email\Templates\TemplatesClient;
use Coss\Email\DedicatedIps\DedicatedIpsClient;
use Coss\Email\Suppressions\SuppressionsClient;
use Coss\Email\Tracking\TrackingClient;
use Coss\Email\Storage\StorageClient;
use Coss\Email\Contacts\ContactsClient;
use Coss\Email\Broadcasts\BroadcastsClient;
use Coss\Email\Audiences\AudiencesClient;
use Coss\Email\Segments\SegmentsClient;
use Coss\Email\Topics\TopicsClient;
use Coss\Email\MarketingSettings\MarketingSettingsClient;
use Coss\Email\Received\ReceivedClient;
use Psr\Http\Client\ClientInterface;
use Coss\Core\Client\RawClient;
use Coss\Email\Requests\ListEmailRequest;
use Coss\Types\EmailSummaryList;
use Coss\Exceptions\CossException;
use Coss\Exceptions\CossApiException;
use Coss\Core\Json\JsonSerializer;
use Coss\Core\Json\JsonApiRequest;
use Coss\Environments;
use Coss\Core\Client\HttpMethod;
use JsonException;
use Psr\Http\Client\ClientExceptionInterface;
use Coss\Email\Requests\SendEmailBody;
use Coss\Types\Email;
use Coss\Core\Client\IdempotencyKey;
use Coss\Email\Requests\SendEmailBatchRequest;
use Coss\Types\EmailBatch;
use Coss\Email\Requests\RescheduleEmailRequest;
use Coss\Types\EmailEventList;
use Coss\Types\EmailLinkList;

class EmailClient
{
    /**
     * @var TemplatesClient $templates
     */
    public TemplatesClient $templates;

    /**
     * @var DedicatedIpsClient $dedicatedIps
     */
    public DedicatedIpsClient $dedicatedIps;

    /**
     * @var SuppressionsClient $suppressions
     */
    public SuppressionsClient $suppressions;

    /**
     * @var TrackingClient $tracking
     */
    public TrackingClient $tracking;

    /**
     * @var StorageClient $storage
     */
    public StorageClient $storage;

    /**
     * @var ContactsClient $contacts
     */
    public ContactsClient $contacts;

    /**
     * @var BroadcastsClient $broadcasts
     */
    public BroadcastsClient $broadcasts;

    /**
     * @var AudiencesClient $audiences
     */
    public AudiencesClient $audiences;

    /**
     * @var SegmentsClient $segments
     */
    public SegmentsClient $segments;

    /**
     * @var TopicsClient $topics
     */
    public TopicsClient $topics;

    /**
     * @var MarketingSettingsClient $marketingSettings
     */
    public MarketingSettingsClient $marketingSettings;

    /**
     * @var ReceivedClient $received
     */
    public ReceivedClient $received;

    /**
     * @var array{
     *   baseUrl?: string,
     *   client?: ClientInterface,
     *   maxRetries?: int,
     *   timeout?: float,
     *   headers?: array<string, string>,
     * } $options @phpstan-ignore-next-line Property is used in endpoint methods via HttpEndpointGenerator
     */
    private array $options;

    /**
     * @var RawClient $client
     */
    private RawClient $client;

    /**
     * @param RawClient $client
     * @param ?array{
     *   baseUrl?: string,
     *   client?: ClientInterface,
     *   maxRetries?: int,
     *   timeout?: float,
     *   headers?: array<string, string>,
     * } $options
     */
    public function __construct(
        RawClient $client,
        ?array $options = null,
    ) {
        $this->client = $client;
        $this->options = $options ?? [];
        $this->templates = new TemplatesClient($this->client, $this->options);
        $this->dedicatedIps = new DedicatedIpsClient($this->client, $this->options);
        $this->suppressions = new SuppressionsClient($this->client, $this->options);
        $this->tracking = new TrackingClient($this->client, $this->options);
        $this->storage = new StorageClient($this->client, $this->options);
        $this->contacts = new ContactsClient($this->client, $this->options);
        $this->broadcasts = new BroadcastsClient($this->client, $this->options);
        $this->audiences = new AudiencesClient($this->client, $this->options);
        $this->segments = new SegmentsClient($this->client, $this->options);
        $this->topics = new TopicsClient($this->client, $this->options);
        $this->marketingSettings = new MarketingSettingsClient($this->client, $this->options);
        $this->received = new ReceivedClient($this->client, $this->options);
    }

    /**
     * Emails sent from the API key's environment, newest first, without their content (retrieve an email for `html`, `text`, `headers` and `attachments`). Filter by recipient (`to`), by the email's or a recipient's status, by category, batch or creation time. Pass the last `id` as `after` to get the next page while `has_more` is true.
     *
     * Example:
     * ```php
     * $client->email->list(
     *     new ListEmailRequest([
     *         'to' => 'user@example.com',
     *     ]),
     * );
     * ```
     *
     * @param ListEmailRequest $request
     * @param ?array{
     *   baseUrl?: string,
     *   maxRetries?: int,
     *   timeout?: float,
     *   headers?: array<string, string>,
     *   queryParameters?: array<string, mixed>,
     *   bodyProperties?: array<string, mixed>,
     * } $options
     * @return ?EmailSummaryList
     * @throws CossException
     * @throws CossApiException
     */
    public function list(ListEmailRequest $request = new ListEmailRequest(), ?array $options = null): ?EmailSummaryList
    {
        $options = array_merge($this->options, $options ?? []);
        $query = [];
        if ($request->to != null) {
            $query['to'] = $request->to;
        }
        if ($request->recipientStatus != null) {
            $query['recipient_status'] = $request->recipientStatus;
        }
        if ($request->status != null) {
            $query['status'] = $request->status;
        }
        if ($request->q != null) {
            $query['q'] = $request->q;
        }
        if ($request->category != null) {
            $query['category'] = $request->category;
        }
        if ($request->batchId != null) {
            $query['batch_id'] = $request->batchId;
        }
        if ($request->createdAfter != null) {
            $query['created_after'] = JsonSerializer::serializeDateTime($request->createdAfter);
        }
        if ($request->createdBefore != null) {
            $query['created_before'] = JsonSerializer::serializeDateTime($request->createdBefore);
        }
        if ($request->limit != null) {
            $query['limit'] = $request->limit;
        }
        if ($request->after != null) {
            $query['after'] = $request->after;
        }
        try {
            $response = $this->client->sendRequest(
                new JsonApiRequest(
                    baseUrl: $options['baseUrl'] ?? $this->client->options['baseUrl'] ?? Environments::Default_->value,
                    path: "v1/emails",
                    method: HttpMethod::GET,
                    query: $query,
                ),
                $options,
            );
            $statusCode = $response->getStatusCode();
            if ($statusCode >= 200 && $statusCode < 400) {
                $json = $response->getBody()->getContents();
                if (empty($json)) {
                    return null;
                }
                return EmailSummaryList::fromJson($json);
            }
        } catch (JsonException $e) {
            throw new CossException(message: "Failed to deserialize response: {$e->getMessage()}", previous: $e);
        } catch (ClientExceptionInterface $e) {
            throw new CossException(message: $e->getMessage(), previous: $e);
        }
        throw new CossApiException(
            message: 'API request failed',
            statusCode: $statusCode,
            body: $response->getBody()->getContents(),
        );
    }

    /**
     * Queues an email from the API key's environment and returns it with `status: "queued"`; it is handed to the delivery provider moments later. Follow it with `GET /v1/emails/{id}` or the `email.sent` / `email.failed` webhooks. Live (`coss_live_…`) keys must send from a verified domain of the organization. Sandbox (`coss_test_…`) keys accept any `from` and never deliver anything; the response has `sandbox: true`. Recipients on the environment's suppression list (for every email, or for the email's `category`) are skipped and get the status `suppressed`. With a future `scheduled_at` the email is stored with the status `scheduled` and sent at that time; the domain and the suppression list are checked again then. Attachments are base64-encoded; only metadata is kept after sending. Recipients count against the organization's send quota (per second and per day; sandbox environments have their own daily quota). With open or click tracking on (the environment's settings, or `tracking`), the HTML body is delivered with a tracking pixel and/or links rewritten to coss.com redirects; the stored `html` stays as sent.
     *
     * Example:
     * ```php
     * $client->email->send(
     *     new SendEmailBody([
     *         'idempotencyKey' => 'welcome-user-123',
     *         'body' => new SendEmailRequest([
     *             'from' => 'Acme <onboarding@acme.com>',
     *             'to' => 'user@example.com',
     *             'subject' => 'Welcome to Acme',
     *             'html' => '<p>Thanks for signing up!</p>',
     *             'tags' => [
     *                 new SendEmailRequestTagsItem([
     *                     'name' => 'template',
     *                     'value' => 'welcome',
     *                 ]),
     *             ],
     *             'category' => 'onboarding',
     *         ]),
     *     ]),
     * );
     * ```
     *
     * @param SendEmailBody $request
     * @param ?array{
     *   baseUrl?: string,
     *   maxRetries?: int,
     *   timeout?: float,
     *   headers?: array<string, string>,
     *   queryParameters?: array<string, mixed>,
     *   bodyProperties?: array<string, mixed>,
     * } $options
     * @return ?Email
     * @throws CossException
     * @throws CossApiException
     */
    public function send(SendEmailBody $request, ?array $options = null): ?Email
    {
        $options = array_merge($this->options, $options ?? []);
        $headers = [];
        if ($request->idempotencyKey != null) {
            $headers['Idempotency-Key'] = $request->idempotencyKey;
        }
        $headers['Idempotency-Key'] ??= IdempotencyKey::generate();
        try {
            $response = $this->client->sendRequest(
                new JsonApiRequest(
                    baseUrl: $options['baseUrl'] ?? $this->client->options['baseUrl'] ?? Environments::Default_->value,
                    path: "v1/emails",
                    method: HttpMethod::POST,
                    headers: $headers,
                    body: $request->body,
                ),
                $options,
            );
            $statusCode = $response->getStatusCode();
            if ($statusCode >= 200 && $statusCode < 400) {
                $json = $response->getBody()->getContents();
                if (empty($json)) {
                    return null;
                }
                return Email::fromJson($json);
            }
        } catch (JsonException $e) {
            throw new CossException(message: "Failed to deserialize response: {$e->getMessage()}", previous: $e);
        } catch (ClientExceptionInterface $e) {
            throw new CossException(message: $e->getMessage(), previous: $e);
        }
        throw new CossApiException(
            message: 'API request failed',
            statusCode: $statusCode,
            body: $response->getBody()->getContents(),
        );
    }

    /**
     * Queues up to 100 emails in one request. Each email is handled exactly as by `POST /v1/emails` (sender checks, suppressions, scheduling, attachments, tracking), but the batch is all or nothing: if any email is invalid, or any `from` is not a verified domain (live keys), nothing is stored and the error names the email (e.g. `emails.3.to`). One `Idempotency-Key` covers the whole batch. The emails' recipients are charged against the send quota together, so a batch with more recipients than the quota allows at once is refused (`quota_exceeded` without `Retry-After`): split it. The request body shares the 40 MB limit of a single send.
     *
     * Example:
     * ```php
     * $client->email->sendBatch(
     *     new SendEmailBatchRequest([
     *         'idempotencyKey' => 'welcome-user-123',
     *         'emails' => [
     *             new SendEmailRequest([
     *                 'from' => 'Acme <notifications@acme.com>',
     *                 'to' => 'ada@example.com',
     *                 'subject' => 'Your weekly summary',
     *                 'html' => '<p>Hi Ada, here is your week.</p>',
     *                 'category' => 'digest',
     *             ]),
     *             new SendEmailRequest([
     *                 'from' => 'Acme <notifications@acme.com>',
     *                 'to' => 'grace@example.com',
     *                 'subject' => 'Your weekly summary',
     *                 'html' => '<p>Hi Grace, here is your week.</p>',
     *                 'category' => 'digest',
     *             ]),
     *         ],
     *     ]),
     * );
     * ```
     *
     * @param SendEmailBatchRequest $request
     * @param ?array{
     *   baseUrl?: string,
     *   maxRetries?: int,
     *   timeout?: float,
     *   headers?: array<string, string>,
     *   queryParameters?: array<string, mixed>,
     *   bodyProperties?: array<string, mixed>,
     * } $options
     * @return ?EmailBatch
     * @throws CossException
     * @throws CossApiException
     */
    public function sendBatch(SendEmailBatchRequest $request, ?array $options = null): ?EmailBatch
    {
        $options = array_merge($this->options, $options ?? []);
        $headers = [];
        if ($request->idempotencyKey != null) {
            $headers['Idempotency-Key'] = $request->idempotencyKey;
        }
        $headers['Idempotency-Key'] ??= IdempotencyKey::generate();
        try {
            $response = $this->client->sendRequest(
                new JsonApiRequest(
                    baseUrl: $options['baseUrl'] ?? $this->client->options['baseUrl'] ?? Environments::Default_->value,
                    path: "v1/emails/batch",
                    method: HttpMethod::POST,
                    headers: $headers,
                    body: $request,
                ),
                $options,
            );
            $statusCode = $response->getStatusCode();
            if ($statusCode >= 200 && $statusCode < 400) {
                $json = $response->getBody()->getContents();
                if (empty($json)) {
                    return null;
                }
                return EmailBatch::fromJson($json);
            }
        } catch (JsonException $e) {
            throw new CossException(message: "Failed to deserialize response: {$e->getMessage()}", previous: $e);
        } catch (ClientExceptionInterface $e) {
            throw new CossException(message: $e->getMessage(), previous: $e);
        }
        throw new CossApiException(
            message: 'API request failed',
            statusCode: $statusCode,
            body: $response->getBody()->getContents(),
        );
    }

    /**
     * A batch sent with `POST /v1/emails/batch`, with its emails' current statuses in the order of the request. Emails past the data retention period are left out. Only batches sent from the API key's own environment can be retrieved.
     *
     * Example:
     * ```php
     * $client->email->getBatch(
     *     'batch_01k8d0n6x5f3w2e1r9t7y4u6i8',
     * );
     * ```
     *
     * @param string $id The batch's id (`batch_id` of its emails).
     * @param ?array{
     *   baseUrl?: string,
     *   maxRetries?: int,
     *   timeout?: float,
     *   headers?: array<string, string>,
     *   queryParameters?: array<string, mixed>,
     *   bodyProperties?: array<string, mixed>,
     * } $options
     * @return ?EmailBatch
     * @throws CossException
     * @throws CossApiException
     */
    public function getBatch(string $id, ?array $options = null): ?EmailBatch
    {
        $options = array_merge($this->options, $options ?? []);
        try {
            $response = $this->client->sendRequest(
                new JsonApiRequest(
                    baseUrl: $options['baseUrl'] ?? $this->client->options['baseUrl'] ?? Environments::Default_->value,
                    path: "v1/emails/batch/" . RawClient::encodePathParam($id),
                    method: HttpMethod::GET,
                ),
                $options,
            );
            $statusCode = $response->getStatusCode();
            if ($statusCode >= 200 && $statusCode < 400) {
                $json = $response->getBody()->getContents();
                if (empty($json)) {
                    return null;
                }
                return EmailBatch::fromJson($json);
            }
        } catch (JsonException $e) {
            throw new CossException(message: "Failed to deserialize response: {$e->getMessage()}", previous: $e);
        } catch (ClientExceptionInterface $e) {
            throw new CossException(message: $e->getMessage(), previous: $e);
        }
        throw new CossApiException(
            message: 'API request failed',
            statusCode: $statusCode,
            body: $response->getBody()->getContents(),
        );
    }

    /**
     * Only emails sent from the API key's own environment can be retrieved.
     *
     * Example:
     * ```php
     * $client->email->get(
     *     'email_01k7c8m4q2f3e9v6t5r1n0p8yz',
     * );
     * ```
     *
     * @param string $id The email's id.
     * @param ?array{
     *   baseUrl?: string,
     *   maxRetries?: int,
     *   timeout?: float,
     *   headers?: array<string, string>,
     *   queryParameters?: array<string, mixed>,
     *   bodyProperties?: array<string, mixed>,
     * } $options
     * @return ?Email
     * @throws CossException
     * @throws CossApiException
     */
    public function get(string $id, ?array $options = null): ?Email
    {
        $options = array_merge($this->options, $options ?? []);
        try {
            $response = $this->client->sendRequest(
                new JsonApiRequest(
                    baseUrl: $options['baseUrl'] ?? $this->client->options['baseUrl'] ?? Environments::Default_->value,
                    path: "v1/emails/" . RawClient::encodePathParam($id),
                    method: HttpMethod::GET,
                ),
                $options,
            );
            $statusCode = $response->getStatusCode();
            if ($statusCode >= 200 && $statusCode < 400) {
                $json = $response->getBody()->getContents();
                if (empty($json)) {
                    return null;
                }
                return Email::fromJson($json);
            }
        } catch (JsonException $e) {
            throw new CossException(message: "Failed to deserialize response: {$e->getMessage()}", previous: $e);
        } catch (ClientExceptionInterface $e) {
            throw new CossException(message: $e->getMessage(), previous: $e);
        }
        throw new CossApiException(
            message: 'API request failed',
            statusCode: $statusCode,
            body: $response->getBody()->getContents(),
        );
    }

    /**
     * Cancels an email sent with a future `scheduled_at` before it is sent. Canceling an already canceled email returns it unchanged. To send it at another time, reschedule it instead.
     *
     * Example:
     * ```php
     * $client->email->cancel(
     *     'email_01k7c8m4q2f3e9v6t5r1n0p8yz',
     * );
     * ```
     *
     * @param string $id The email's id.
     * @param ?array{
     *   baseUrl?: string,
     *   maxRetries?: int,
     *   timeout?: float,
     *   headers?: array<string, string>,
     *   queryParameters?: array<string, mixed>,
     *   bodyProperties?: array<string, mixed>,
     * } $options
     * @return ?Email
     * @throws CossException
     * @throws CossApiException
     */
    public function cancel(string $id, ?array $options = null): ?Email
    {
        $options = array_merge($this->options, $options ?? []);
        $headers = [];
        $headers['Idempotency-Key'] ??= IdempotencyKey::generate();
        try {
            $response = $this->client->sendRequest(
                new JsonApiRequest(
                    baseUrl: $options['baseUrl'] ?? $this->client->options['baseUrl'] ?? Environments::Default_->value,
                    path: "v1/emails/" . RawClient::encodePathParam($id) . "/cancel",
                    method: HttpMethod::POST,
                    headers: $headers,
                ),
                $options,
            );
            $statusCode = $response->getStatusCode();
            if ($statusCode >= 200 && $statusCode < 400) {
                $json = $response->getBody()->getContents();
                if (empty($json)) {
                    return null;
                }
                return Email::fromJson($json);
            }
        } catch (JsonException $e) {
            throw new CossException(message: "Failed to deserialize response: {$e->getMessage()}", previous: $e);
        } catch (ClientExceptionInterface $e) {
            throw new CossException(message: $e->getMessage(), previous: $e);
        }
        throw new CossApiException(
            message: 'API request failed',
            statusCode: $statusCode,
            body: $response->getBody()->getContents(),
        );
    }

    /**
     * Moves an email sent with a future `scheduled_at` to a new time, at most 30 days from now, and records an `email.rescheduled` event. A time that is not in the future sends it within seconds. Rescheduling to the time it already has returns it unchanged. The domain and the suppression list are still checked when it is sent.
     *
     * Example:
     * ```php
     * $client->email->reschedule(
     *     'email_01k7c8m4q2f3e9v6t5r1n0p8yz',
     *     new RescheduleEmailRequest([
     *         'scheduledAt' => new DateTime('2026-10-12T09:00:00Z'),
     *     ]),
     * );
     * ```
     *
     * @param string $id The email's id.
     * @param RescheduleEmailRequest $request
     * @param ?array{
     *   baseUrl?: string,
     *   maxRetries?: int,
     *   timeout?: float,
     *   headers?: array<string, string>,
     *   queryParameters?: array<string, mixed>,
     *   bodyProperties?: array<string, mixed>,
     * } $options
     * @return ?Email
     * @throws CossException
     * @throws CossApiException
     */
    public function reschedule(string $id, RescheduleEmailRequest $request, ?array $options = null): ?Email
    {
        $options = array_merge($this->options, $options ?? []);
        $headers = [];
        $headers['Idempotency-Key'] ??= IdempotencyKey::generate();
        try {
            $response = $this->client->sendRequest(
                new JsonApiRequest(
                    baseUrl: $options['baseUrl'] ?? $this->client->options['baseUrl'] ?? Environments::Default_->value,
                    path: "v1/emails/" . RawClient::encodePathParam($id) . "/reschedule",
                    method: HttpMethod::POST,
                    headers: $headers,
                    body: $request,
                ),
                $options,
            );
            $statusCode = $response->getStatusCode();
            if ($statusCode >= 200 && $statusCode < 400) {
                $json = $response->getBody()->getContents();
                if (empty($json)) {
                    return null;
                }
                return Email::fromJson($json);
            }
        } catch (JsonException $e) {
            throw new CossException(message: "Failed to deserialize response: {$e->getMessage()}", previous: $e);
        } catch (ClientExceptionInterface $e) {
            throw new CossException(message: $e->getMessage(), previous: $e);
        }
        throw new CossApiException(
            message: 'API request failed',
            statusCode: $statusCode,
            body: $response->getBody()->getContents(),
        );
    }

    /**
     * Every delivery event of the email, oldest first: `email.scheduled`, `email.rescheduled`, `email.canceled`, `email.sent` and `email.failed` for the whole email, and `email.delivered`, `email.delivery_delayed`, `email.bounced`, `email.complained` and `email.suppressed` (skipped because of the suppression list) per recipient, plus `email.opened` and `email.clicked` when tracking is on (attributed to a recipient only when the email had a single one) and `email.unsubscribed` after a one-click unsubscribe.
     *
     * Example:
     * ```php
     * $client->email->listEvents(
     *     'email_01k7c8m4q2f3e9v6t5r1n0p8yz',
     * );
     * ```
     *
     * @param string $id The email's id.
     * @param ?array{
     *   baseUrl?: string,
     *   maxRetries?: int,
     *   timeout?: float,
     *   headers?: array<string, string>,
     *   queryParameters?: array<string, mixed>,
     *   bodyProperties?: array<string, mixed>,
     * } $options
     * @return ?EmailEventList
     * @throws CossException
     * @throws CossApiException
     */
    public function listEvents(string $id, ?array $options = null): ?EmailEventList
    {
        $options = array_merge($this->options, $options ?? []);
        try {
            $response = $this->client->sendRequest(
                new JsonApiRequest(
                    baseUrl: $options['baseUrl'] ?? $this->client->options['baseUrl'] ?? Environments::Default_->value,
                    path: "v1/emails/" . RawClient::encodePathParam($id) . "/events",
                    method: HttpMethod::GET,
                ),
                $options,
            );
            $statusCode = $response->getStatusCode();
            if ($statusCode >= 200 && $statusCode < 400) {
                $json = $response->getBody()->getContents();
                if (empty($json)) {
                    return null;
                }
                return EmailEventList::fromJson($json);
            }
        } catch (JsonException $e) {
            throw new CossException(message: "Failed to deserialize response: {$e->getMessage()}", previous: $e);
        } catch (ClientExceptionInterface $e) {
            throw new CossException(message: $e->getMessage(), previous: $e);
        }
        throw new CossApiException(
            message: 'API request failed',
            statusCode: $statusCode,
            body: $response->getBody()->getContents(),
        );
    }

    /**
     * The links coss.com rewrote for click tracking, in the order they appear in the HTML, with their click counts. Empty unless the email was sent with click tracking.
     *
     * Example:
     * ```php
     * $client->email->listLinks(
     *     'email_01k7c8m4q2f3e9v6t5r1n0p8yz',
     * );
     * ```
     *
     * @param string $id The email's id.
     * @param ?array{
     *   baseUrl?: string,
     *   maxRetries?: int,
     *   timeout?: float,
     *   headers?: array<string, string>,
     *   queryParameters?: array<string, mixed>,
     *   bodyProperties?: array<string, mixed>,
     * } $options
     * @return ?EmailLinkList
     * @throws CossException
     * @throws CossApiException
     */
    public function listLinks(string $id, ?array $options = null): ?EmailLinkList
    {
        $options = array_merge($this->options, $options ?? []);
        try {
            $response = $this->client->sendRequest(
                new JsonApiRequest(
                    baseUrl: $options['baseUrl'] ?? $this->client->options['baseUrl'] ?? Environments::Default_->value,
                    path: "v1/emails/" . RawClient::encodePathParam($id) . "/links",
                    method: HttpMethod::GET,
                ),
                $options,
            );
            $statusCode = $response->getStatusCode();
            if ($statusCode >= 200 && $statusCode < 400) {
                $json = $response->getBody()->getContents();
                if (empty($json)) {
                    return null;
                }
                return EmailLinkList::fromJson($json);
            }
        } catch (JsonException $e) {
            throw new CossException(message: "Failed to deserialize response: {$e->getMessage()}", previous: $e);
        } catch (ClientExceptionInterface $e) {
            throw new CossException(message: $e->getMessage(), previous: $e);
        }
        throw new CossApiException(
            message: 'API request failed',
            statusCode: $statusCode,
            body: $response->getBody()->getContents(),
        );
    }
}
