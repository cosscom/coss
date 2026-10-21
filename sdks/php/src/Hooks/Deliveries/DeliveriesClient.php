<?php

namespace Coss\Hooks\Deliveries;

use Psr\Http\Client\ClientInterface;
use Coss\Core\Client\RawClient;
use Coss\Types\HookDelivery;
use Coss\Exceptions\CossException;
use Coss\Exceptions\CossApiException;
use Coss\Core\Json\JsonApiRequest;
use Coss\Environments;
use Coss\Core\Client\HttpMethod;
use JsonException;
use Psr\Http\Client\ClientExceptionInterface;
use Coss\Types\HookAttemptList;
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
     * One message's delivery to one endpoint.
     *
     * Example:
     * ```php
     * $client->hooks->deliveries->get(
     *     'customer_8812',
     *     'hdel_01k7c8m4q2f3e9v6t5r1n0p8yz',
     * );
     * ```
     *
     * @param string $application The application's `id` (`happ_…`) or your `uid` for it.
     * @param string $deliveryId
     * @param ?array{
     *   baseUrl?: string,
     *   maxRetries?: int,
     *   timeout?: float,
     *   headers?: array<string, string>,
     *   queryParameters?: array<string, mixed>,
     *   bodyProperties?: array<string, mixed>,
     * } $options
     * @return ?HookDelivery
     * @throws CossException
     * @throws CossApiException
     */
    public function get(string $application, string $deliveryId, ?array $options = null): ?HookDelivery
    {
        $options = array_merge($this->options, $options ?? []);
        try {
            $response = $this->client->sendRequest(
                new JsonApiRequest(
                    baseUrl: $options['baseUrl'] ?? $this->client->options['baseUrl'] ?? Environments::Default_->value,
                    path: "v1/hooks/applications/{$application}/deliveries/{$deliveryId}",
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
                return HookDelivery::fromJson($json);
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
     * Every HTTP request of the delivery, oldest first, with response excerpts.
     *
     * Example:
     * ```php
     * $client->hooks->deliveries->listAttempts(
     *     'customer_8812',
     *     'hdel_01k7c8m4q2f3e9v6t5r1n0p8yz',
     * );
     * ```
     *
     * @param string $application The application's `id` (`happ_…`) or your `uid` for it.
     * @param string $deliveryId
     * @param ?array{
     *   baseUrl?: string,
     *   maxRetries?: int,
     *   timeout?: float,
     *   headers?: array<string, string>,
     *   queryParameters?: array<string, mixed>,
     *   bodyProperties?: array<string, mixed>,
     * } $options
     * @return ?HookAttemptList
     * @throws CossException
     * @throws CossApiException
     */
    public function listAttempts(string $application, string $deliveryId, ?array $options = null): ?HookAttemptList
    {
        $options = array_merge($this->options, $options ?? []);
        try {
            $response = $this->client->sendRequest(
                new JsonApiRequest(
                    baseUrl: $options['baseUrl'] ?? $this->client->options['baseUrl'] ?? Environments::Default_->value,
                    path: "v1/hooks/applications/{$application}/deliveries/{$deliveryId}/attempts",
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
                return HookAttemptList::fromJson($json);
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
     * Queues a finished delivery for one more attempt within seconds, to the endpoint's current URL and secret. A `pending` delivery is returned unchanged.
     *
     * Example:
     * ```php
     * $client->hooks->deliveries->retry(
     *     'customer_8812',
     *     'hdel_01k7c8m4q2f3e9v6t5r1n0p8yz',
     * );
     * ```
     *
     * @param string $application The application's `id` (`happ_…`) or your `uid` for it.
     * @param string $deliveryId
     * @param ?array{
     *   baseUrl?: string,
     *   maxRetries?: int,
     *   timeout?: float,
     *   headers?: array<string, string>,
     *   queryParameters?: array<string, mixed>,
     *   bodyProperties?: array<string, mixed>,
     * } $options
     * @return ?HookDelivery
     * @throws CossException
     * @throws CossApiException
     */
    public function retry(string $application, string $deliveryId, ?array $options = null): ?HookDelivery
    {
        $options = array_merge($this->options, $options ?? []);
        $options['maxRetries'] = 0;
        $headers = [];
        $headers['Idempotency-Key'] ??= IdempotencyKey::generate();
        try {
            $response = $this->client->sendRequest(
                new JsonApiRequest(
                    baseUrl: $options['baseUrl'] ?? $this->client->options['baseUrl'] ?? Environments::Default_->value,
                    path: "v1/hooks/applications/{$application}/deliveries/{$deliveryId}/retry",
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
                return HookDelivery::fromJson($json);
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
