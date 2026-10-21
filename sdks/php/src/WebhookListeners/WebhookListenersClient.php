<?php

namespace Coss\WebhookListeners;

use Psr\Http\Client\ClientInterface;
use Coss\Core\Client\RawClient;
use Coss\WebhookListeners\Requests\CreateWebhookListenerRequest;
use Coss\Types\WebhookListener;
use Coss\Exceptions\CossException;
use Coss\Exceptions\CossApiException;
use Coss\Core\Client\IdempotencyKey;
use Coss\Core\Json\JsonApiRequest;
use Coss\Environments;
use Coss\Core\Client\HttpMethod;
use JsonException;
use Psr\Http\Client\ClientExceptionInterface;
use Coss\WebhookListeners\Requests\PollWebhookListenerRequest;
use Coss\Types\WebhookListenerPoll;
use Coss\Types\DeletedWebhookListener;

class WebhookListenersClient
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
     * Listeners are how `coss listen` forwards events to a local server: coss.com can't reach `localhost`, so the CLI pulls them. They belong to the API key's environment, receive events created after they open, and don't count toward the plan's webhook endpoints. A listener closes when it is deleted or after 10 minutes without a poll; an environment has at most 5 open at once. Events reach it unsigned: the CLI signs what it forwards with its own secret.
     *
     * Example:
     * ```php
     * $client->webhookListeners->create(
     *     new CreateWebhookListenerRequest([
     *         'eventTypes' => [
     *             CreateWebhookListenerRequestEventTypesItem::EmailSent->value,
     *             CreateWebhookListenerRequestEventTypesItem::EmailDelivered->value,
     *         ],
     *         'description' => 'localhost:3000/webhooks',
     *     ]),
     * );
     * ```
     *
     * @param CreateWebhookListenerRequest $request
     * @param ?array{
     *   baseUrl?: string,
     *   maxRetries?: int,
     *   timeout?: float,
     *   headers?: array<string, string>,
     *   queryParameters?: array<string, mixed>,
     *   bodyProperties?: array<string, mixed>,
     * } $options
     * @return ?WebhookListener
     * @throws CossException
     * @throws CossApiException
     */
    public function create(CreateWebhookListenerRequest $request = new CreateWebhookListenerRequest(), ?array $options = null): ?WebhookListener
    {
        $options = array_merge($this->options, $options ?? []);
        $options['maxRetries'] = 0;
        $headers = [];
        $headers['Idempotency-Key'] ??= IdempotencyKey::generate();
        try {
            $response = $this->client->sendRequest(
                new JsonApiRequest(
                    baseUrl: $options['baseUrl'] ?? $this->client->options['baseUrl'] ?? Environments::Default_->value,
                    path: "v1/webhook_listeners",
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
                return WebhookListener::fromJson($json);
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
     * Acknowledges deliveries handed out earlier, keeps the listener open for another 10 minutes, and waits up to `wait_ms` (at most 25 s) for events. Deliveries come oldest first; one not acknowledged within two minutes is handed out again (with the same `event_id`). The answer may come early, with no deliveries, when the API restarts: poll again. Polls are not request-logged; each acknowledgement is logged as a `webhook.forward` line.
     *
     * Example:
     * ```php
     * $client->webhookListeners->poll(
     *     'whlis_01k7c8m4q2f3e9v6t5r1n0p8yz',
     *     new PollWebhookListenerRequest([
     *         'acks' => [
     *             new WebhookListenerAck([
     *                 'deliveryId' => 'whlisdel_01k7c8n2b5d7f9h1k3m5p7r9tv',
     *                 'ackToken' => 'mfz3k2a8',
     *                 'statusCode' => 200,
     *                 'durationMs' => 12,
     *                 'error' => null,
     *             ]),
     *         ],
     *         'waitMs' => 20000,
     *     ]),
     * );
     * ```
     *
     * @param string $id The webhook listener's id.
     * @param PollWebhookListenerRequest $request
     * @param ?array{
     *   baseUrl?: string,
     *   maxRetries?: int,
     *   timeout?: float,
     *   headers?: array<string, string>,
     *   queryParameters?: array<string, mixed>,
     *   bodyProperties?: array<string, mixed>,
     * } $options
     * @return ?WebhookListenerPoll
     * @throws CossException
     * @throws CossApiException
     */
    public function poll(string $id, PollWebhookListenerRequest $request = new PollWebhookListenerRequest(), ?array $options = null): ?WebhookListenerPoll
    {
        $options = array_merge($this->options, $options ?? []);
        $options['maxRetries'] = 0;
        $headers = [];
        $headers['Idempotency-Key'] ??= IdempotencyKey::generate();
        try {
            $response = $this->client->sendRequest(
                new JsonApiRequest(
                    baseUrl: $options['baseUrl'] ?? $this->client->options['baseUrl'] ?? Environments::Default_->value,
                    path: "v1/webhook_listeners/" . RawClient::encodePathParam($id) . "/poll",
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
                return WebhookListenerPoll::fromJson($json);
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
     * Closes the listener: it receives nothing more, and deliveries it was still holding are dropped. `coss listen` closes its listener when it exits.
     *
     * Example:
     * ```php
     * $client->webhookListeners->delete(
     *     'whlis_01k7c8m4q2f3e9v6t5r1n0p8yz',
     * );
     * ```
     *
     * @param string $id The webhook listener's id.
     * @param ?array{
     *   baseUrl?: string,
     *   maxRetries?: int,
     *   timeout?: float,
     *   headers?: array<string, string>,
     *   queryParameters?: array<string, mixed>,
     *   bodyProperties?: array<string, mixed>,
     * } $options
     * @return ?DeletedWebhookListener
     * @throws CossException
     * @throws CossApiException
     */
    public function delete(string $id, ?array $options = null): ?DeletedWebhookListener
    {
        $options = array_merge($this->options, $options ?? []);
        try {
            $response = $this->client->sendRequest(
                new JsonApiRequest(
                    baseUrl: $options['baseUrl'] ?? $this->client->options['baseUrl'] ?? Environments::Default_->value,
                    path: "v1/webhook_listeners/" . RawClient::encodePathParam($id),
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
                return DeletedWebhookListener::fromJson($json);
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
