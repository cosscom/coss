<?php

namespace Coss\Inboxes\Threads;

use Psr\Http\Client\ClientInterface;
use Coss\Core\Client\RawClient;
use Coss\Inboxes\Threads\Requests\ListThreadsRequest;
use Coss\Types\InboxThreadList;
use Coss\Exceptions\CossException;
use Coss\Exceptions\CossApiException;
use Coss\Core\Json\JsonApiRequest;
use Coss\Environments;
use Coss\Core\Client\HttpMethod;
use JsonException;
use Psr\Http\Client\ClientExceptionInterface;
use Coss\Types\InboxThread;
use Coss\Types\DeletedInboxThread;

class ThreadsClient
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
     * The inbox's conversations, the one with the latest message first, with a preview of that message. A thread whose `last_inbound_at` equals its `last_message_at` awaits a reply. Pass the last `id` as `after` to get the next page while `has_more` is true.
     *
     * Example:
     * ```php
     * $client->inboxes->threads->list(
     *     'inbox_01k7c8m4q2f3e9v6t5r1n0p8yz',
     *     new ListThreadsRequest([]),
     * );
     * ```
     *
     * @param string $inboxId The inbox's id.
     * @param ListThreadsRequest $request
     * @param ?array{
     *   baseUrl?: string,
     *   maxRetries?: int,
     *   timeout?: float,
     *   headers?: array<string, string>,
     *   queryParameters?: array<string, mixed>,
     *   bodyProperties?: array<string, mixed>,
     * } $options
     * @return ?InboxThreadList
     * @throws CossException
     * @throws CossApiException
     */
    public function list(string $inboxId, ListThreadsRequest $request = new ListThreadsRequest(), ?array $options = null): ?InboxThreadList
    {
        $options = array_merge($this->options, $options ?? []);
        $query = [];
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
                    path: "v1/inboxes/" . RawClient::encodePathParam($inboxId) . "/threads",
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
                return InboxThreadList::fromJson($json);
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
     * The conversation with its latest messages, oldest first, each with its text and `extracted_text` (its own words, without the quoted conversation): what an agent reads before it replies. HTML is the sender's: sanitize it before showing it to anyone.
     *
     * Example:
     * ```php
     * $client->inboxes->threads->get(
     *     'inbox_01k7c8m4q2f3e9v6t5r1n0p8yz',
     *     'thread_01k7c8m4r0c2b8w9y3d5f6g7h8',
     * );
     * ```
     *
     * @param string $inboxId The inbox's id.
     * @param string $threadId The thread's id.
     * @param ?array{
     *   baseUrl?: string,
     *   maxRetries?: int,
     *   timeout?: float,
     *   headers?: array<string, string>,
     *   queryParameters?: array<string, mixed>,
     *   bodyProperties?: array<string, mixed>,
     * } $options
     * @return ?InboxThread
     * @throws CossException
     * @throws CossApiException
     */
    public function get(string $inboxId, string $threadId, ?array $options = null): ?InboxThread
    {
        $options = array_merge($this->options, $options ?? []);
        try {
            $response = $this->client->sendRequest(
                new JsonApiRequest(
                    baseUrl: $options['baseUrl'] ?? $this->client->options['baseUrl'] ?? Environments::Default_->value,
                    path: "v1/inboxes/" . RawClient::encodePathParam($inboxId) . "/threads/" . RawClient::encodePathParam($threadId),
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
                return InboxThread::fromJson($json);
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
     * Removes the conversation from the inbox. Its received emails and emails stay in the environment until their retention ends; a later reply starts a new thread.
     *
     * Example:
     * ```php
     * $client->inboxes->threads->delete(
     *     'inbox_01k7c8m4q2f3e9v6t5r1n0p8yz',
     *     'thread_01k7c8m4r0c2b8w9y3d5f6g7h8',
     * );
     * ```
     *
     * @param string $inboxId The inbox's id.
     * @param string $threadId The thread's id.
     * @param ?array{
     *   baseUrl?: string,
     *   maxRetries?: int,
     *   timeout?: float,
     *   headers?: array<string, string>,
     *   queryParameters?: array<string, mixed>,
     *   bodyProperties?: array<string, mixed>,
     * } $options
     * @return ?DeletedInboxThread
     * @throws CossException
     * @throws CossApiException
     */
    public function delete(string $inboxId, string $threadId, ?array $options = null): ?DeletedInboxThread
    {
        $options = array_merge($this->options, $options ?? []);
        try {
            $response = $this->client->sendRequest(
                new JsonApiRequest(
                    baseUrl: $options['baseUrl'] ?? $this->client->options['baseUrl'] ?? Environments::Default_->value,
                    path: "v1/inboxes/" . RawClient::encodePathParam($inboxId) . "/threads/" . RawClient::encodePathParam($threadId),
                    method: HttpMethod::DELETE,
                ),
                $options,
            );
            $statusCode = $response->getStatusCode();
            if ($statusCode >= 200 && $statusCode < 400) {
                $json = $response->getBody()->getContents();
                if (empty($json)) {
                    return null;
                }
                return DeletedInboxThread::fromJson($json);
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
