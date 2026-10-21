<?php

namespace Coss\Hooks\Endpoints;

use Psr\Http\Client\ClientInterface;
use Coss\Core\Client\RawClient;
use Coss\Types\HookEndpointList;
use Coss\Exceptions\CossException;
use Coss\Exceptions\CossApiException;
use Coss\Core\Json\JsonApiRequest;
use Coss\Environments;
use Coss\Core\Client\HttpMethod;
use JsonException;
use Psr\Http\Client\ClientExceptionInterface;
use Coss\Hooks\Endpoints\Requests\CreateHookEndpointRequest;
use Coss\Types\HookEndpointWithSecret;
use Coss\Core\Client\IdempotencyKey;
use Coss\Types\HookEndpoint;
use Coss\Types\DeletedHookEndpoint;
use Coss\Hooks\Endpoints\Requests\UpdateHookEndpointRequest;
use Coss\Types\HookEndpointSecret;
use Coss\Hooks\Endpoints\Requests\RollHookEndpointSecretRequest;
use Coss\Hooks\Endpoints\Requests\RecoverHookEndpointRequest;
use Coss\Types\HookEndpointRecovery;
use Coss\Hooks\Endpoints\Requests\SendHookTestRequest;
use Coss\Types\HookMessage;
use Coss\Hooks\Endpoints\Requests\ListDeliveriesEndpointsRequest;
use Coss\Types\HookDeliveryList;

class EndpointsClient
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
     * The application's endpoints, oldest first. Secrets are never included.
     *
     * Example:
     * ```php
     * $client->hooks->endpoints->list(
     *     'customer_8812',
     * );
     * ```
     *
     * @param string $application The application's `id` (`happ_…`) or your `uid` for it.
     * @param ?array{
     *   baseUrl?: string,
     *   maxRetries?: int,
     *   timeout?: float,
     *   headers?: array<string, string>,
     *   queryParameters?: array<string, mixed>,
     *   bodyProperties?: array<string, mixed>,
     * } $options
     * @return ?HookEndpointList
     * @throws CossException
     * @throws CossApiException
     */
    public function list(string $application, ?array $options = null): ?HookEndpointList
    {
        $options = array_merge($this->options, $options ?? []);
        try {
            $response = $this->client->sendRequest(
                new JsonApiRequest(
                    baseUrl: $options['baseUrl'] ?? $this->client->options['baseUrl'] ?? Environments::Default_->value,
                    path: "v1/hooks/applications/{$application}/endpoints",
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
                return HookEndpointList::fromJson($json);
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
     * Registers a URL of the application's user that receives its messages, each request signed (Standard Webhooks) with the endpoint's own secret, returned here. Usually your users add endpoints themselves in the portal. Hooks resources belong to the API key's own environment: a `coss_test_…` key only ever sees sandbox ones, a `coss_live_…` key only production ones.
     *
     * Example:
     * ```php
     * $client->hooks->endpoints->create(
     *     'customer_8812',
     *     new CreateHookEndpointRequest([
     *         'url' => 'https://example.com/webhooks',
     *         'filterTypes' => [
     *             'invoice.paid',
     *         ],
     *     ]),
     * );
     * ```
     *
     * @param string $application The application's `id` (`happ_…`) or your `uid` for it.
     * @param CreateHookEndpointRequest $request
     * @param ?array{
     *   baseUrl?: string,
     *   maxRetries?: int,
     *   timeout?: float,
     *   headers?: array<string, string>,
     *   queryParameters?: array<string, mixed>,
     *   bodyProperties?: array<string, mixed>,
     * } $options
     * @return ?HookEndpointWithSecret
     * @throws CossException
     * @throws CossApiException
     */
    public function create(string $application, CreateHookEndpointRequest $request, ?array $options = null): ?HookEndpointWithSecret
    {
        $options = array_merge($this->options, $options ?? []);
        $options['maxRetries'] = 0;
        $headers = [];
        $headers['Idempotency-Key'] ??= IdempotencyKey::generate();
        try {
            $response = $this->client->sendRequest(
                new JsonApiRequest(
                    baseUrl: $options['baseUrl'] ?? $this->client->options['baseUrl'] ?? Environments::Default_->value,
                    path: "v1/hooks/applications/{$application}/endpoints",
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
                return HookEndpointWithSecret::fromJson($json);
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
     * An endpoint of the application.
     *
     * Example:
     * ```php
     * $client->hooks->endpoints->get(
     *     'customer_8812',
     *     'hep_01k7c8m4q2f3e9v6t5r1n0p8yz',
     * );
     * ```
     *
     * @param string $application The application's `id` (`happ_…`) or your `uid` for it.
     * @param string $endpointId The endpoint's id.
     * @param ?array{
     *   baseUrl?: string,
     *   maxRetries?: int,
     *   timeout?: float,
     *   headers?: array<string, string>,
     *   queryParameters?: array<string, mixed>,
     *   bodyProperties?: array<string, mixed>,
     * } $options
     * @return ?HookEndpoint
     * @throws CossException
     * @throws CossApiException
     */
    public function get(string $application, string $endpointId, ?array $options = null): ?HookEndpoint
    {
        $options = array_merge($this->options, $options ?? []);
        try {
            $response = $this->client->sendRequest(
                new JsonApiRequest(
                    baseUrl: $options['baseUrl'] ?? $this->client->options['baseUrl'] ?? Environments::Default_->value,
                    path: "v1/hooks/applications/{$application}/endpoints/{$endpointId}",
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
                return HookEndpoint::fromJson($json);
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
     * Deletes the endpoint; its pending deliveries fail. Its delivery log stays.
     *
     * Example:
     * ```php
     * $client->hooks->endpoints->delete(
     *     'customer_8812',
     *     'hep_01k7c8m4q2f3e9v6t5r1n0p8yz',
     * );
     * ```
     *
     * @param string $application The application's `id` (`happ_…`) or your `uid` for it.
     * @param string $endpointId The endpoint's id.
     * @param ?array{
     *   baseUrl?: string,
     *   maxRetries?: int,
     *   timeout?: float,
     *   headers?: array<string, string>,
     *   queryParameters?: array<string, mixed>,
     *   bodyProperties?: array<string, mixed>,
     * } $options
     * @return ?DeletedHookEndpoint
     * @throws CossException
     * @throws CossApiException
     */
    public function delete(string $application, string $endpointId, ?array $options = null): ?DeletedHookEndpoint
    {
        $options = array_merge($this->options, $options ?? []);
        try {
            $response = $this->client->sendRequest(
                new JsonApiRequest(
                    baseUrl: $options['baseUrl'] ?? $this->client->options['baseUrl'] ?? Environments::Default_->value,
                    path: "v1/hooks/applications/{$application}/endpoints/{$endpointId}",
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
                return DeletedHookEndpoint::fromJson($json);
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
     * Changes the URL, description, filter types, rate limit, metadata or `enabled`. Enabling it again clears a failure streak. The secret stays the same (see roll secret).
     *
     * Example:
     * ```php
     * $client->hooks->endpoints->update(
     *     'customer_8812',
     *     'hep_01k7c8m4q2f3e9v6t5r1n0p8yz',
     *     new UpdateHookEndpointRequest([
     *         'enabled' => false,
     *     ]),
     * );
     * ```
     *
     * @param string $application The application's `id` (`happ_…`) or your `uid` for it.
     * @param string $endpointId The endpoint's id.
     * @param UpdateHookEndpointRequest $request
     * @param ?array{
     *   baseUrl?: string,
     *   maxRetries?: int,
     *   timeout?: float,
     *   headers?: array<string, string>,
     *   queryParameters?: array<string, mixed>,
     *   bodyProperties?: array<string, mixed>,
     * } $options
     * @return ?HookEndpoint
     * @throws CossException
     * @throws CossApiException
     */
    public function update(string $application, string $endpointId, UpdateHookEndpointRequest $request = new UpdateHookEndpointRequest(), ?array $options = null): ?HookEndpoint
    {
        $options = array_merge($this->options, $options ?? []);
        try {
            $response = $this->client->sendRequest(
                new JsonApiRequest(
                    baseUrl: $options['baseUrl'] ?? $this->client->options['baseUrl'] ?? Environments::Default_->value,
                    path: "v1/hooks/applications/{$application}/endpoints/{$endpointId}",
                    method: HttpMethod::PATCH,
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
                return HookEndpoint::fromJson($json);
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
     * The endpoint's current signing secret, e.g. to show its user. Needs `hook:update`, like rolling it.
     *
     * Example:
     * ```php
     * $client->hooks->endpoints->getSecret(
     *     'customer_8812',
     *     'hep_01k7c8m4q2f3e9v6t5r1n0p8yz',
     * );
     * ```
     *
     * @param string $application The application's `id` (`happ_…`) or your `uid` for it.
     * @param string $endpointId The endpoint's id.
     * @param ?array{
     *   baseUrl?: string,
     *   maxRetries?: int,
     *   timeout?: float,
     *   headers?: array<string, string>,
     *   queryParameters?: array<string, mixed>,
     *   bodyProperties?: array<string, mixed>,
     * } $options
     * @return ?HookEndpointSecret
     * @throws CossException
     * @throws CossApiException
     */
    public function getSecret(string $application, string $endpointId, ?array $options = null): ?HookEndpointSecret
    {
        $options = array_merge($this->options, $options ?? []);
        try {
            $response = $this->client->sendRequest(
                new JsonApiRequest(
                    baseUrl: $options['baseUrl'] ?? $this->client->options['baseUrl'] ?? Environments::Default_->value,
                    path: "v1/hooks/applications/{$application}/endpoints/{$endpointId}/secret",
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
                return HookEndpointSecret::fromJson($json);
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
     * Replaces the signing secret, returned here. Until `previous_secret_expires_at`, requests carry a signature with each secret, so the receiver can switch without rejecting any. Not idempotent.
     *
     * Example:
     * ```php
     * $client->hooks->endpoints->rollSecret(
     *     'customer_8812',
     *     'hep_01k7c8m4q2f3e9v6t5r1n0p8yz',
     *     new RollHookEndpointSecretRequest([
     *         'previousSecretExpiresIn' => 3600,
     *     ]),
     * );
     * ```
     *
     * @param string $application The application's `id` (`happ_…`) or your `uid` for it.
     * @param string $endpointId The endpoint's id.
     * @param RollHookEndpointSecretRequest $request
     * @param ?array{
     *   baseUrl?: string,
     *   maxRetries?: int,
     *   timeout?: float,
     *   headers?: array<string, string>,
     *   queryParameters?: array<string, mixed>,
     *   bodyProperties?: array<string, mixed>,
     * } $options
     * @return ?HookEndpointWithSecret
     * @throws CossException
     * @throws CossApiException
     */
    public function rollSecret(string $application, string $endpointId, RollHookEndpointSecretRequest $request = new RollHookEndpointSecretRequest(), ?array $options = null): ?HookEndpointWithSecret
    {
        $options = array_merge($this->options, $options ?? []);
        $options['maxRetries'] = 0;
        $headers = [];
        $headers['Idempotency-Key'] ??= IdempotencyKey::generate();
        try {
            $response = $this->client->sendRequest(
                new JsonApiRequest(
                    baseUrl: $options['baseUrl'] ?? $this->client->options['baseUrl'] ?? Environments::Default_->value,
                    path: "v1/hooks/applications/{$application}/endpoints/{$endpointId}/roll_secret",
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
                return HookEndpointWithSecret::fromJson($json);
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
     * Queues every delivery to the endpoint that failed, of messages sent since `since`, for one more attempt each, e.g. after its receiver was down. coss.com works through them in the background (oldest first); follow `status` with the returned recovery. The endpoint must be enabled.
     *
     * Example:
     * ```php
     * $client->hooks->endpoints->recover(
     *     'customer_8812',
     *     'hep_01k7c8m4q2f3e9v6t5r1n0p8yz',
     *     new RecoverHookEndpointRequest([
     *         'since' => new DateTime('2026-01-15T00:00:00Z'),
     *     ]),
     * );
     * ```
     *
     * @param string $application The application's `id` (`happ_…`) or your `uid` for it.
     * @param string $endpointId The endpoint's id.
     * @param RecoverHookEndpointRequest $request
     * @param ?array{
     *   baseUrl?: string,
     *   maxRetries?: int,
     *   timeout?: float,
     *   headers?: array<string, string>,
     *   queryParameters?: array<string, mixed>,
     *   bodyProperties?: array<string, mixed>,
     * } $options
     * @return ?HookEndpointRecovery
     * @throws CossException
     * @throws CossApiException
     */
    public function recover(string $application, string $endpointId, RecoverHookEndpointRequest $request, ?array $options = null): ?HookEndpointRecovery
    {
        $options = array_merge($this->options, $options ?? []);
        $headers = [];
        $headers['Idempotency-Key'] ??= IdempotencyKey::generate();
        try {
            $response = $this->client->sendRequest(
                new JsonApiRequest(
                    baseUrl: $options['baseUrl'] ?? $this->client->options['baseUrl'] ?? Environments::Default_->value,
                    path: "v1/hooks/applications/{$application}/endpoints/{$endpointId}/recover",
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
                return HookEndpointRecovery::fromJson($json);
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
     * A recovery of the endpoint: `pending` while deliveries are still being requeued.
     *
     * Example:
     * ```php
     * $client->hooks->endpoints->getRecovery(
     *     'customer_8812',
     *     'hep_01k7c8m4q2f3e9v6t5r1n0p8yz',
     *     'hrec_01k7c8m4q2f3e9v6t5r1n0p8yz',
     * );
     * ```
     *
     * @param string $application The application's `id` (`happ_…`) or your `uid` for it.
     * @param string $endpointId The endpoint's id.
     * @param string $recoveryId
     * @param ?array{
     *   baseUrl?: string,
     *   maxRetries?: int,
     *   timeout?: float,
     *   headers?: array<string, string>,
     *   queryParameters?: array<string, mixed>,
     *   bodyProperties?: array<string, mixed>,
     * } $options
     * @return ?HookEndpointRecovery
     * @throws CossException
     * @throws CossApiException
     */
    public function getRecovery(string $application, string $endpointId, string $recoveryId, ?array $options = null): ?HookEndpointRecovery
    {
        $options = array_merge($this->options, $options ?? []);
        try {
            $response = $this->client->sendRequest(
                new JsonApiRequest(
                    baseUrl: $options['baseUrl'] ?? $this->client->options['baseUrl'] ?? Environments::Default_->value,
                    path: "v1/hooks/applications/{$application}/endpoints/{$endpointId}/recoveries/{$recoveryId}",
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
                return HookEndpointRecovery::fromJson($json);
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
     * Sends a message to this endpoint only (whatever its filter), with the given payload or the event type's first example. It counts against the send quota like any message.
     *
     * Example:
     * ```php
     * $client->hooks->endpoints->sendTest(
     *     'customer_8812',
     *     'hep_01k7c8m4q2f3e9v6t5r1n0p8yz',
     *     new SendHookTestRequest([
     *         'eventType' => 'invoice.paid',
     *     ]),
     * );
     * ```
     *
     * @param string $application The application's `id` (`happ_…`) or your `uid` for it.
     * @param string $endpointId The endpoint's id.
     * @param SendHookTestRequest $request
     * @param ?array{
     *   baseUrl?: string,
     *   maxRetries?: int,
     *   timeout?: float,
     *   headers?: array<string, string>,
     *   queryParameters?: array<string, mixed>,
     *   bodyProperties?: array<string, mixed>,
     * } $options
     * @return ?HookMessage
     * @throws CossException
     * @throws CossApiException
     */
    public function sendTest(string $application, string $endpointId, SendHookTestRequest $request, ?array $options = null): ?HookMessage
    {
        $options = array_merge($this->options, $options ?? []);
        $options['maxRetries'] = 0;
        $headers = [];
        $headers['Idempotency-Key'] ??= IdempotencyKey::generate();
        try {
            $response = $this->client->sendRequest(
                new JsonApiRequest(
                    baseUrl: $options['baseUrl'] ?? $this->client->options['baseUrl'] ?? Environments::Default_->value,
                    path: "v1/hooks/applications/{$application}/endpoints/{$endpointId}/test",
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
                return HookMessage::fromJson($json);
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
     * The endpoint's deliveries, newest first.
     *
     * Example:
     * ```php
     * $client->hooks->endpoints->listDeliveries(
     *     'customer_8812',
     *     'hep_01k7c8m4q2f3e9v6t5r1n0p8yz',
     *     new ListDeliveriesEndpointsRequest([]),
     * );
     * ```
     *
     * @param string $application The application's `id` (`happ_…`) or your `uid` for it.
     * @param string $endpointId The endpoint's id.
     * @param ListDeliveriesEndpointsRequest $request
     * @param ?array{
     *   baseUrl?: string,
     *   maxRetries?: int,
     *   timeout?: float,
     *   headers?: array<string, string>,
     *   queryParameters?: array<string, mixed>,
     *   bodyProperties?: array<string, mixed>,
     * } $options
     * @return ?HookDeliveryList
     * @throws CossException
     * @throws CossApiException
     */
    public function listDeliveries(string $application, string $endpointId, ListDeliveriesEndpointsRequest $request = new ListDeliveriesEndpointsRequest(), ?array $options = null): ?HookDeliveryList
    {
        $options = array_merge($this->options, $options ?? []);
        $query = [];
        if ($request->status != null) {
            $query['status'] = $request->status;
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
                    path: "v1/hooks/applications/{$application}/endpoints/{$endpointId}/deliveries",
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
                return HookDeliveryList::fromJson($json);
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
