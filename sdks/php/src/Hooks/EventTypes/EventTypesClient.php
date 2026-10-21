<?php

namespace Coss\Hooks\EventTypes;

use Psr\Http\Client\ClientInterface;
use Coss\Core\Client\RawClient;
use Coss\Hooks\EventTypes\Requests\ListEventTypesRequest;
use Coss\Types\HookEventTypeList;
use Coss\Exceptions\CossException;
use Coss\Exceptions\CossApiException;
use Coss\Core\Json\JsonApiRequest;
use Coss\Environments;
use Coss\Core\Client\HttpMethod;
use JsonException;
use Psr\Http\Client\ClientExceptionInterface;
use Coss\Hooks\EventTypes\Requests\CreateHookEventTypeRequest;
use Coss\Types\HookEventType;
use Coss\Core\Client\IdempotencyKey;
use Coss\Hooks\EventTypes\Requests\UpdateHookEventTypeRequest;

class EventTypesClient
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
     * The environment's event types by name; archived ones only with `include_archived`.
     *
     * Example:
     * ```php
     * $client->hooks->eventTypes->list(
     *     new ListEventTypesRequest([]),
     * );
     * ```
     *
     * @param ListEventTypesRequest $request
     * @param ?array{
     *   baseUrl?: string,
     *   maxRetries?: int,
     *   timeout?: float,
     *   headers?: array<string, string>,
     *   queryParameters?: array<string, mixed>,
     *   bodyProperties?: array<string, mixed>,
     * } $options
     * @return ?HookEventTypeList
     * @throws CossException
     * @throws CossApiException
     */
    public function list(ListEventTypesRequest $request = new ListEventTypesRequest(), ?array $options = null): ?HookEventTypeList
    {
        $options = array_merge($this->options, $options ?? []);
        $query = [];
        if ($request->includeArchived != null) {
            $query['include_archived'] = $request->includeArchived;
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
                    path: "v1/hooks/event_types",
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
                return HookEventTypeList::fromJson($json);
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
     * Adds a type to the catalog your applications' users subscribe from (in the portal, or the `filter_types` of an endpoint), with a description, a JSON Schema and examples to show them. Messages can be sent with any type, registered or not. Hooks resources belong to the API key's own environment: a `coss_test_…` key only ever sees sandbox ones, a `coss_live_…` key only production ones.
     *
     * Example:
     * ```php
     * $client->hooks->eventTypes->create(
     *     new CreateHookEventTypeRequest([
     *         'name' => 'invoice.paid',
     *         'description' => 'An invoice was paid in full.',
     *         'examples' => [
     *             [
     *                 'invoice_id' => "in_1042",
     *                 'amount' => 4200,
     *                 'currency' => "usd",
     *             ],
     *         ],
     *     ]),
     * );
     * ```
     *
     * @param CreateHookEventTypeRequest $request
     * @param ?array{
     *   baseUrl?: string,
     *   maxRetries?: int,
     *   timeout?: float,
     *   headers?: array<string, string>,
     *   queryParameters?: array<string, mixed>,
     *   bodyProperties?: array<string, mixed>,
     * } $options
     * @return ?HookEventType
     * @throws CossException
     * @throws CossApiException
     */
    public function create(CreateHookEventTypeRequest $request, ?array $options = null): ?HookEventType
    {
        $options = array_merge($this->options, $options ?? []);
        $options['maxRetries'] = 0;
        $headers = [];
        $headers['Idempotency-Key'] ??= IdempotencyKey::generate();
        try {
            $response = $this->client->sendRequest(
                new JsonApiRequest(
                    baseUrl: $options['baseUrl'] ?? $this->client->options['baseUrl'] ?? Environments::Default_->value,
                    path: "v1/hooks/event_types",
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
                return HookEventType::fromJson($json);
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
     * An event type of the API key's environment, archived or not.
     *
     * Example:
     * ```php
     * $client->hooks->eventTypes->get(
     *     'invoice.paid',
     * );
     * ```
     *
     * @param string $name The event type's name.
     * @param ?array{
     *   baseUrl?: string,
     *   maxRetries?: int,
     *   timeout?: float,
     *   headers?: array<string, string>,
     *   queryParameters?: array<string, mixed>,
     *   bodyProperties?: array<string, mixed>,
     * } $options
     * @return ?HookEventType
     * @throws CossException
     * @throws CossApiException
     */
    public function get(string $name, ?array $options = null): ?HookEventType
    {
        $options = array_merge($this->options, $options ?? []);
        try {
            $response = $this->client->sendRequest(
                new JsonApiRequest(
                    baseUrl: $options['baseUrl'] ?? $this->client->options['baseUrl'] ?? Environments::Default_->value,
                    path: "v1/hooks/event_types/{$name}",
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
                return HookEventType::fromJson($json);
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
     * Hides the type from the portal and from new subscriptions. Endpoints already subscribed keep receiving it. Restore it with `PATCH … { archived: false }`.
     *
     * Example:
     * ```php
     * $client->hooks->eventTypes->archive(
     *     'invoice.paid',
     * );
     * ```
     *
     * @param string $name The event type's name.
     * @param ?array{
     *   baseUrl?: string,
     *   maxRetries?: int,
     *   timeout?: float,
     *   headers?: array<string, string>,
     *   queryParameters?: array<string, mixed>,
     *   bodyProperties?: array<string, mixed>,
     * } $options
     * @return ?HookEventType
     * @throws CossException
     * @throws CossApiException
     */
    public function archive(string $name, ?array $options = null): ?HookEventType
    {
        $options = array_merge($this->options, $options ?? []);
        try {
            $response = $this->client->sendRequest(
                new JsonApiRequest(
                    baseUrl: $options['baseUrl'] ?? $this->client->options['baseUrl'] ?? Environments::Default_->value,
                    path: "v1/hooks/event_types/{$name}",
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
                return HookEventType::fromJson($json);
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
     * Changes its description, schema or examples, or archives or restores it.
     *
     * Example:
     * ```php
     * $client->hooks->eventTypes->update(
     *     'invoice.paid',
     *     new UpdateHookEventTypeRequest([
     *         'archived' => false,
     *     ]),
     * );
     * ```
     *
     * @param string $name The event type's name.
     * @param UpdateHookEventTypeRequest $request
     * @param ?array{
     *   baseUrl?: string,
     *   maxRetries?: int,
     *   timeout?: float,
     *   headers?: array<string, string>,
     *   queryParameters?: array<string, mixed>,
     *   bodyProperties?: array<string, mixed>,
     * } $options
     * @return ?HookEventType
     * @throws CossException
     * @throws CossApiException
     */
    public function update(string $name, UpdateHookEventTypeRequest $request = new UpdateHookEventTypeRequest(), ?array $options = null): ?HookEventType
    {
        $options = array_merge($this->options, $options ?? []);
        try {
            $response = $this->client->sendRequest(
                new JsonApiRequest(
                    baseUrl: $options['baseUrl'] ?? $this->client->options['baseUrl'] ?? Environments::Default_->value,
                    path: "v1/hooks/event_types/{$name}",
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
                return HookEventType::fromJson($json);
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
