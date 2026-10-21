<?php

namespace Coss\WebhookEndpoints\Deliveries;

use Psr\Http\Client\ClientInterface;
use Coss\Core\Client\RawClient;
use Coss\WebhookEndpoints\Deliveries\Requests\ListDeliveriesRequest;
use Coss\Types\WebhookDeliveryList;
use Coss\Exceptions\CossException;
use Coss\Exceptions\CossApiException;
use Coss\Core\Json\JsonApiRequest;
use Coss\Environments;
use Coss\Core\Client\HttpMethod;
use JsonException;
use Psr\Http\Client\ClientExceptionInterface;
use Coss\Types\WebhookDelivery;
use Coss\Core\Client\IdempotencyKey;

class DeliveriesClient
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
     * The endpoint's delivery log, newest first: one delivery per event sent to it, with every HTTP attempt and the payload as sent. Pass the last `id` as `after` to get the next page while `has_more` is true. Deleting the endpoint deletes its log.
     *
     * Example:
     * ```php
     * $client->webhookEndpoints->deliveries->list(
     *     'whep_01k7c8m4q2f3e9v6t5r1n0p8yz',
     *     new ListDeliveriesRequest([]),
     * );
     * ```
     *
     * @param string $id The webhook endpoint's id.
     * @param ListDeliveriesRequest $request
     * @param ?array{
     *   baseUrl?: string,
     *   maxRetries?: int,
     *   timeout?: float,
     *   headers?: array<string, string>,
     *   queryParameters?: array<string, mixed>,
     *   bodyProperties?: array<string, mixed>,
     * } $options
     * @return ?WebhookDeliveryList
     * @throws CossException
     * @throws CossApiException
     */
    public function list(string $id, ListDeliveriesRequest $request = new ListDeliveriesRequest(), ?array $options = null): ?WebhookDeliveryList
    {
        $options = array_merge($this->options, $options ?? []);
        $query = [];
        if ($request->status != null) {
            $query['status'] = $request->status;
        }
        if ($request->eventId != null) {
            $query['event_id'] = $request->eventId;
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
                    path: "v1/webhook_endpoints/{$id}/deliveries",
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
                return WebhookDeliveryList::fromJson($json);
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
     * One delivery of the endpoint, with every HTTP attempt and the payload as sent.
     *
     * Example:
     * ```php
     * $client->webhookEndpoints->deliveries->get(
     *     'whep_01k7c8m4q2f3e9v6t5r1n0p8yz',
     *     'whdel_01k7c8n2b5d7f9h1k3m5p7r9tv',
     * );
     * ```
     *
     * @param string $id The webhook endpoint's id.
     * @param string $deliveryId The delivery's id.
     * @param ?array{
     *   baseUrl?: string,
     *   maxRetries?: int,
     *   timeout?: float,
     *   headers?: array<string, string>,
     *   queryParameters?: array<string, mixed>,
     *   bodyProperties?: array<string, mixed>,
     * } $options
     * @return ?WebhookDelivery
     * @throws CossException
     * @throws CossApiException
     */
    public function get(string $id, string $deliveryId, ?array $options = null): ?WebhookDelivery
    {
        $options = array_merge($this->options, $options ?? []);
        try {
            $response = $this->client->sendRequest(
                new JsonApiRequest(
                    baseUrl: $options['baseUrl'] ?? $this->client->options['baseUrl'] ?? Environments::Default_->value,
                    path: "v1/webhook_endpoints/{$id}/deliveries/{$deliveryId}",
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
                return WebhookDelivery::fromJson($json);
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
     * Queues a finished delivery (`succeeded` or `failed`) for one more attempt, made within seconds, signed with the endpoint's current secret and sent to its current URL. A delivery that is still `pending` is returned unchanged: it is already scheduled for `next_attempt_at` (automatic retries stop after 8 attempts).
     *
     * Example:
     * ```php
     * $client->webhookEndpoints->deliveries->retry(
     *     'whep_01k7c8m4q2f3e9v6t5r1n0p8yz',
     *     'whdel_01k7c8n2b5d7f9h1k3m5p7r9tv',
     * );
     * ```
     *
     * @param string $id The webhook endpoint's id.
     * @param string $deliveryId The delivery's id.
     * @param ?array{
     *   baseUrl?: string,
     *   maxRetries?: int,
     *   timeout?: float,
     *   headers?: array<string, string>,
     *   queryParameters?: array<string, mixed>,
     *   bodyProperties?: array<string, mixed>,
     * } $options
     * @return ?WebhookDelivery
     * @throws CossException
     * @throws CossApiException
     */
    public function retry(string $id, string $deliveryId, ?array $options = null): ?WebhookDelivery
    {
        $options = array_merge($this->options, $options ?? []);
        $options['maxRetries'] = 0;
        $headers = [];
        $headers['Idempotency-Key'] ??= IdempotencyKey::generate();
        try {
            $response = $this->client->sendRequest(
                new JsonApiRequest(
                    baseUrl: $options['baseUrl'] ?? $this->client->options['baseUrl'] ?? Environments::Default_->value,
                    path: "v1/webhook_endpoints/{$id}/deliveries/{$deliveryId}/retry",
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
                return WebhookDelivery::fromJson($json);
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
