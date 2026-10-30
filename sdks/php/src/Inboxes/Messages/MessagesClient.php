<?php

namespace Coss\Inboxes\Messages;

use Psr\Http\Client\ClientInterface;
use Coss\Core\Client\RawClient;
use Coss\Inboxes\Messages\Requests\ListMessagesRequest;
use Coss\Types\InboxMessageList;
use Coss\Exceptions\CossException;
use Coss\Exceptions\CossApiException;
use Coss\Core\Json\JsonApiRequest;
use Coss\Environments;
use Coss\Core\Client\HttpMethod;
use JsonException;
use Psr\Http\Client\ClientExceptionInterface;
use Coss\Inboxes\Messages\Requests\SendInboxMessageRequest;
use Coss\Types\InboxMessage;
use Coss\Core\Client\IdempotencyKey;
use Coss\Inboxes\Messages\Requests\ReplyInboxMessageRequest;

class MessagesClient
{
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
    }

    /**
     * Messages of every thread, newest first, with a preview instead of their bodies (retrieve one for those). Pass the last `id` as `after` to get the next page while `has_more` is true.
     *
     * Example:
     * ```php
     * $client->inboxes->messages->list(
     *     'inbox_01k7c8m4q2f3e9v6t5r1n0p8yz',
     *     new ListMessagesRequest([]),
     * );
     * ```
     *
     * @param string $inboxId The inbox's id.
     * @param ListMessagesRequest $request
     * @param ?array{
     *   baseUrl?: string,
     *   maxRetries?: int,
     *   timeout?: float,
     *   headers?: array<string, string>,
     *   queryParameters?: array<string, mixed>,
     *   bodyProperties?: array<string, mixed>,
     * } $options
     * @return ?InboxMessageList
     * @throws CossException
     * @throws CossApiException
     */
    public function list(string $inboxId, ListMessagesRequest $request = new ListMessagesRequest(), ?array $options = null): ?InboxMessageList
    {
        $options = array_merge($this->options, $options ?? []);
        $query = [];
        if ($request->limit != null) {
            $query['limit'] = $request->limit;
        }
        if ($request->after != null) {
            $query['after'] = $request->after;
        }
        if ($request->direction != null) {
            $query['direction'] = $request->direction;
        }
        try {
            $response = $this->client->sendRequest(
                new JsonApiRequest(
                    baseUrl: $options['baseUrl'] ?? $this->client->options['baseUrl'] ?? Environments::Default_->value,
                    path: "v1/inboxes/" . RawClient::encodePathParam($inboxId) . "/messages",
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
                return InboxMessageList::fromJson($json);
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
     * Starts a thread with a message from the inbox's address, sent like any email (its `email_id` has its delivery events and webhooks; never tracked). Replies to it arrive in the same thread. Live inboxes send only from receiving domains under one of the organization's verified domains (`can_send`); sandbox ones always can, and deliver nothing. Recipients count against the send quota.
     *
     * Example:
     * ```php
     * $client->inboxes->messages->send(
     *     'inbox_01k7c8m4q2f3e9v6t5r1n0p8yz',
     *     new SendInboxMessageRequest([
     *         'idempotencyKey' => 'welcome-user-123',
     *         'to' => 'jane@example.com',
     *         'subject' => 'Your order',
     *         'text' => 'Hi Jane, your order has shipped.',
     *     ]),
     * );
     * ```
     *
     * @param string $inboxId The inbox's id.
     * @param SendInboxMessageRequest $request
     * @param ?array{
     *   baseUrl?: string,
     *   maxRetries?: int,
     *   timeout?: float,
     *   headers?: array<string, string>,
     *   queryParameters?: array<string, mixed>,
     *   bodyProperties?: array<string, mixed>,
     * } $options
     * @return ?InboxMessage
     * @throws CossException
     * @throws CossApiException
     */
    public function send(string $inboxId, SendInboxMessageRequest $request, ?array $options = null): ?InboxMessage
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
                    path: "v1/inboxes/" . RawClient::encodePathParam($inboxId) . "/messages",
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
                return InboxMessage::fromJson($json);
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
     * The message with its text, HTML and `extracted_text`. An outbound message's delivery is its email's (`email_id`).
     *
     * Example:
     * ```php
     * $client->inboxes->messages->get(
     *     'inbox_01k7c8m4q2f3e9v6t5r1n0p8yz',
     *     'imsg_01k7c8m4s1d3c9x0z4e6g7h8j9',
     * );
     * ```
     *
     * @param string $inboxId The inbox's id.
     * @param string $messageId The message's id.
     * @param ?array{
     *   baseUrl?: string,
     *   maxRetries?: int,
     *   timeout?: float,
     *   headers?: array<string, string>,
     *   queryParameters?: array<string, mixed>,
     *   bodyProperties?: array<string, mixed>,
     * } $options
     * @return ?InboxMessage
     * @throws CossException
     * @throws CossApiException
     */
    public function get(string $inboxId, string $messageId, ?array $options = null): ?InboxMessage
    {
        $options = array_merge($this->options, $options ?? []);
        try {
            $response = $this->client->sendRequest(
                new JsonApiRequest(
                    baseUrl: $options['baseUrl'] ?? $this->client->options['baseUrl'] ?? Environments::Default_->value,
                    path: "v1/inboxes/" . RawClient::encodePathParam($inboxId) . "/messages/" . RawClient::encodePathParam($messageId),
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
                return InboxMessage::fromJson($json);
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
     * An inbound message's attachment, always as `application/octet-stream` (its declared type is the attachment's `content_type`): treat it as untrusted.
     *
     * Example:
     * ```php
     * $client->inboxes->messages->getAttachment(
     *     'inbox_id',
     *     'message_id',
     *     'attachment_id',
     * );
     * ```
     *
     * @param string $inboxId The inbox's id.
     * @param string $messageId The message's id.
     * @param string $attachmentId The attachment's id (from the message's `attachments`).
     * @param ?array{
     *   baseUrl?: string,
     *   maxRetries?: int,
     *   timeout?: float,
     *   headers?: array<string, string>,
     *   queryParameters?: array<string, mixed>,
     *   bodyProperties?: array<string, mixed>,
     * } $options
     * @return string
     * @throws CossException
     * @throws CossApiException
     */
    public function getAttachment(string $inboxId, string $messageId, string $attachmentId, ?array $options = null): string
    {
        $options = array_merge($this->options, $options ?? []);
        try {
            $response = $this->client->sendRequest(
                new JsonApiRequest(
                    baseUrl: $options['baseUrl'] ?? $this->client->options['baseUrl'] ?? Environments::Default_->value,
                    path: "v1/inboxes/" . RawClient::encodePathParam($inboxId) . "/messages/" . RawClient::encodePathParam($messageId) . "/attachments/" . RawClient::encodePathParam($attachmentId),
                    method: HttpMethod::GET,
                ),
                $options,
            );
            $statusCode = $response->getStatusCode();
            if ($statusCode >= 200 && $statusCode < 400) {
                return $response->getBody()->getContents();
            }
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
     * Replies in the message's thread from the inbox's address: to its sender (its `Reply-To` first), or to an outbound message's recipients again for a follow-up; `reply_all` adds everyone else on it. The subject gets `Re:`, and `In-Reply-To`/`References` let the recipient's mail client thread it. Sent like any email, counted against the send quota.
     *
     * Example:
     * ```php
     * $client->inboxes->messages->reply(
     *     'inbox_01k7c8m4q2f3e9v6t5r1n0p8yz',
     *     'imsg_01k7c8m4s1d3c9x0z4e6g7h8j9',
     *     new ReplyInboxMessageRequest([
     *         'idempotencyKey' => 'welcome-user-123',
     *         'text' => 'Sorry about that, Jane! A new one is on its way.',
     *     ]),
     * );
     * ```
     *
     * @param string $inboxId The inbox's id.
     * @param string $messageId The message's id.
     * @param ReplyInboxMessageRequest $request
     * @param ?array{
     *   baseUrl?: string,
     *   maxRetries?: int,
     *   timeout?: float,
     *   headers?: array<string, string>,
     *   queryParameters?: array<string, mixed>,
     *   bodyProperties?: array<string, mixed>,
     * } $options
     * @return ?InboxMessage
     * @throws CossException
     * @throws CossApiException
     */
    public function reply(string $inboxId, string $messageId, ReplyInboxMessageRequest $request = new ReplyInboxMessageRequest(), ?array $options = null): ?InboxMessage
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
                    path: "v1/inboxes/" . RawClient::encodePathParam($inboxId) . "/messages/" . RawClient::encodePathParam($messageId) . "/reply",
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
                return InboxMessage::fromJson($json);
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
