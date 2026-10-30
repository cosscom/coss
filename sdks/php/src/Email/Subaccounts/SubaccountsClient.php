<?php

namespace Coss\Email\Subaccounts;

use Psr\Http\Client\ClientInterface;
use Coss\Core\Client\RawClient;
use Coss\Email\Subaccounts\Requests\ListSubaccountsRequest;
use Coss\Types\SubaccountList;
use Coss\Exceptions\CossException;
use Coss\Exceptions\CossApiException;
use Coss\Core\Json\JsonApiRequest;
use Coss\Environments;
use Coss\Core\Client\HttpMethod;
use JsonException;
use Psr\Http\Client\ClientExceptionInterface;
use Coss\Email\Subaccounts\Requests\CreateSubaccountRequest;
use Coss\Types\Subaccount;
use Coss\Core\Client\IdempotencyKey;
use Coss\Email\Subaccounts\Requests\UpdateSubaccountRequest;
use Coss\Email\Subaccounts\Requests\StatsSubaccountsRequest;
use Coss\Types\SubaccountStats;
use Coss\Core\Json\JsonSerializer;

class SubaccountsClient
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
     * The environment's sub-accounts, newest first. Sub-accounts belong to the API key's own environment: a `coss_test_…` key only ever sees sandbox ones, a `coss_live_…` key only production ones.
     *
     * Example:
     * ```php
     * $client->email->subaccounts->list(
     *     new ListSubaccountsRequest([
     *         'after' => 'sub_01k7c8m4q2f3e9v6t5r1n0p8yz',
     *     ]),
     * );
     * ```
     *
     * @param ListSubaccountsRequest $request
     * @param ?array{
     *   baseUrl?: string,
     *   maxRetries?: int,
     *   timeout?: float,
     *   headers?: array<string, string>,
     *   queryParameters?: array<string, mixed>,
     *   bodyProperties?: array<string, mixed>,
     * } $options
     * @return ?SubaccountList
     * @throws CossException
     * @throws CossApiException
     */
    public function list(ListSubaccountsRequest $request = new ListSubaccountsRequest(), ?array $options = null): ?SubaccountList
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
                    path: "v1/subaccounts",
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
                return SubaccountList::fromJson($json);
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
     * Creates a sub-account: one of your users, who gets their own domains, suppressions, quotas and reputation. Give it a `uid` (e.g. your user's id) to address it by in every path and send. Sub-accounts belong to the API key's own environment: a `coss_test_…` key only ever sees sandbox ones, a `coss_live_…` key only production ones.
     *
     * Example:
     * ```php
     * $client->email->subaccounts->create(
     *     new CreateSubaccountRequest([
     *         'name' => 'Acme Bakery',
     *         'uid' => 'user_8812',
     *         'quotas' => new CreateSubaccountRequestQuotas([
     *             'recipientsPerDay' => 5000,
     *         ]),
     *     ]),
     * );
     * ```
     *
     * @param CreateSubaccountRequest $request
     * @param ?array{
     *   baseUrl?: string,
     *   maxRetries?: int,
     *   timeout?: float,
     *   headers?: array<string, string>,
     *   queryParameters?: array<string, mixed>,
     *   bodyProperties?: array<string, mixed>,
     * } $options
     * @return ?Subaccount
     * @throws CossException
     * @throws CossApiException
     */
    public function create(CreateSubaccountRequest $request, ?array $options = null): ?Subaccount
    {
        $options = array_merge($this->options, $options ?? []);
        $options['maxRetries'] = 0;
        $headers = [];
        $headers['Idempotency-Key'] ??= IdempotencyKey::generate();
        try {
            $response = $this->client->sendRequest(
                new JsonApiRequest(
                    baseUrl: $options['baseUrl'] ?? $this->client->options['baseUrl'] ?? Environments::Default_->value,
                    path: "v1/subaccounts",
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
                return Subaccount::fromJson($json);
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
     * A sub-account of the API key's environment, by its id or uid, with its quotas and reputation.
     *
     * Example:
     * ```php
     * $client->email->subaccounts->get(
     *     'user_8812',
     * );
     * ```
     *
     * @param string $subaccount The sub-account's `id` (`sub_…`) or your `uid` for it.
     * @param ?array{
     *   baseUrl?: string,
     *   maxRetries?: int,
     *   timeout?: float,
     *   headers?: array<string, string>,
     *   queryParameters?: array<string, mixed>,
     *   bodyProperties?: array<string, mixed>,
     * } $options
     * @return ?Subaccount
     * @throws CossException
     * @throws CossApiException
     */
    public function get(string $subaccount, ?array $options = null): ?Subaccount
    {
        $options = array_merge($this->options, $options ?? []);
        try {
            $response = $this->client->sendRequest(
                new JsonApiRequest(
                    baseUrl: $options['baseUrl'] ?? $this->client->options['baseUrl'] ?? Environments::Default_->value,
                    path: "v1/subaccounts/" . RawClient::encodePathParam($subaccount),
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
                return Subaccount::fromJson($json);
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
     * Starts deleting the sub-account: its sends are refused at once, then its domains are released and it is removed with its suppressions (`status` is `deleting` until then). Its emails stay, with its id. Repeating the call returns it as it is.
     *
     * Example:
     * ```php
     * $client->email->subaccounts->delete(
     *     'user_8812',
     * );
     * ```
     *
     * @param string $subaccount The sub-account's `id` (`sub_…`) or your `uid` for it.
     * @param ?array{
     *   baseUrl?: string,
     *   maxRetries?: int,
     *   timeout?: float,
     *   headers?: array<string, string>,
     *   queryParameters?: array<string, mixed>,
     *   bodyProperties?: array<string, mixed>,
     * } $options
     * @return ?Subaccount
     * @throws CossException
     * @throws CossApiException
     */
    public function delete(string $subaccount, ?array $options = null): ?Subaccount
    {
        $options = array_merge($this->options, $options ?? []);
        try {
            $response = $this->client->sendRequest(
                new JsonApiRequest(
                    baseUrl: $options['baseUrl'] ?? $this->client->options['baseUrl'] ?? Environments::Default_->value,
                    path: "v1/subaccounts/" . RawClient::encodePathParam($subaccount),
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
                return Subaccount::fromJson($json);
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
     * Changes the name, uid, metadata, status or quotas. Fields left out keep their value; `status: "disabled"` refuses its sends until it is `active` again.
     *
     * Example:
     * ```php
     * $client->email->subaccounts->update(
     *     'user_8812',
     *     new UpdateSubaccountRequest([
     *         'status' => UpdateSubaccountRequestStatus::Disabled->value,
     *     ]),
     * );
     * ```
     *
     * @param string $subaccount The sub-account's `id` (`sub_…`) or your `uid` for it.
     * @param UpdateSubaccountRequest $request
     * @param ?array{
     *   baseUrl?: string,
     *   maxRetries?: int,
     *   timeout?: float,
     *   headers?: array<string, string>,
     *   queryParameters?: array<string, mixed>,
     *   bodyProperties?: array<string, mixed>,
     * } $options
     * @return ?Subaccount
     * @throws CossException
     * @throws CossApiException
     */
    public function update(string $subaccount, UpdateSubaccountRequest $request = new UpdateSubaccountRequest(), ?array $options = null): ?Subaccount
    {
        $options = array_merge($this->options, $options ?? []);
        try {
            $response = $this->client->sendRequest(
                new JsonApiRequest(
                    baseUrl: $options['baseUrl'] ?? $this->client->options['baseUrl'] ?? Environments::Default_->value,
                    path: "v1/subaccounts/" . RawClient::encodePathParam($subaccount),
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
                return Subaccount::fromJson($json);
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
     * Lifts the sub-account's reputation pause (or warning) once you fixed what caused it: its rates are measured again from now on. A pause is never lifted on its own. Repeating the call returns it as it is. Your organization's own reputation still counts its sending.
     *
     * Example:
     * ```php
     * $client->email->subaccounts->reinstate(
     *     'user_8812',
     * );
     * ```
     *
     * @param string $subaccount The sub-account's `id` (`sub_…`) or your `uid` for it.
     * @param ?array{
     *   baseUrl?: string,
     *   maxRetries?: int,
     *   timeout?: float,
     *   headers?: array<string, string>,
     *   queryParameters?: array<string, mixed>,
     *   bodyProperties?: array<string, mixed>,
     * } $options
     * @return ?Subaccount
     * @throws CossException
     * @throws CossApiException
     */
    public function reinstate(string $subaccount, ?array $options = null): ?Subaccount
    {
        $options = array_merge($this->options, $options ?? []);
        $headers = [];
        $headers['Idempotency-Key'] ??= IdempotencyKey::generate();
        try {
            $response = $this->client->sendRequest(
                new JsonApiRequest(
                    baseUrl: $options['baseUrl'] ?? $this->client->options['baseUrl'] ?? Environments::Default_->value,
                    path: "v1/subaccounts/" . RawClient::encodePathParam($subaccount) . "/reinstate",
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
                return Subaccount::fromJson($json);
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
     * The sub-account's sending per UTC day: recipients, sent, delivered, bounced, complained, failed and suppressed, counted from its emails as they are now (a later bounce moves its day's numbers). Emails are kept 45 days, so earlier days are left out.
     *
     * Example:
     * ```php
     * $client->email->subaccounts->stats(
     *     'user_8812',
     *     new StatsSubaccountsRequest([
     *         'from' => new DateTime('2026-10-01'),
     *         'to' => new DateTime('2026-10-15'),
     *     ]),
     * );
     * ```
     *
     * @param string $subaccount The sub-account's `id` (`sub_…`) or your `uid` for it.
     * @param StatsSubaccountsRequest $request
     * @param ?array{
     *   baseUrl?: string,
     *   maxRetries?: int,
     *   timeout?: float,
     *   headers?: array<string, string>,
     *   queryParameters?: array<string, mixed>,
     *   bodyProperties?: array<string, mixed>,
     * } $options
     * @return ?SubaccountStats
     * @throws CossException
     * @throws CossApiException
     */
    public function stats(string $subaccount, StatsSubaccountsRequest $request = new StatsSubaccountsRequest(), ?array $options = null): ?SubaccountStats
    {
        $options = array_merge($this->options, $options ?? []);
        $query = [];
        if ($request->from != null) {
            $query['from'] = JsonSerializer::serializeDate($request->from);
        }
        if ($request->to != null) {
            $query['to'] = JsonSerializer::serializeDate($request->to);
        }
        try {
            $response = $this->client->sendRequest(
                new JsonApiRequest(
                    baseUrl: $options['baseUrl'] ?? $this->client->options['baseUrl'] ?? Environments::Default_->value,
                    path: "v1/subaccounts/" . RawClient::encodePathParam($subaccount) . "/stats",
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
                return SubaccountStats::fromJson($json);
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
