<?php

namespace Coss\Billing;

use Coss\Billing\Invoices\InvoicesClient;
use Coss\Billing\Credits\CreditsClient;
use Psr\Http\Client\ClientInterface;
use Coss\Core\Client\RawClient;
use Coss\Types\Billing;
use Coss\Exceptions\CossException;
use Coss\Exceptions\CossApiException;
use Coss\Core\Json\JsonApiRequest;
use Coss\Environments;
use Coss\Core\Client\HttpMethod;
use JsonException;
use Psr\Http\Client\ClientExceptionInterface;
use Coss\Billing\Requests\UsageBillingRequest;
use Coss\Types\UsageList;
use Coss\Core\Json\JsonSerializer;

class BillingClient
{
    /**
     * @var InvoicesClient $invoices
     */
    public InvoicesClient $invoices;

    /**
     * @var CreditsClient $credits
     */
    public CreditsClient $credits;

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
        $this->invoices = new InvoicesClient($this->client, $this->options);
        $this->credits = new CreditsClient($this->client, $this->options);
    }

    /**
     * The organization's plan (and contract), the current billing month's usage and what it would add to the next invoice so far, its standing (`past_due`, billing holds), payment method, and what the plan includes. Organization-wide: every environment's key sees the same. Plan changes are made in the dashboard; subscribe to the `billing.*` webhook events to follow them.
     *
     * Example:
     * ```php
     * $client->billing->get();
     * ```
     *
     * @param ?array{
     *   baseUrl?: string,
     *   maxRetries?: int,
     *   timeout?: float,
     *   headers?: array<string, string>,
     *   queryParameters?: array<string, mixed>,
     *   bodyProperties?: array<string, mixed>,
     * } $options
     * @return ?Billing
     * @throws CossException
     * @throws CossApiException
     */
    public function get(?array $options = null): ?Billing
    {
        $options = array_merge($this->options, $options ?? []);
        try {
            $response = $this->client->sendRequest(
                new JsonApiRequest(
                    baseUrl: $options['baseUrl'] ?? $this->client->options['baseUrl'] ?? Environments::Default_->value,
                    path: "v1/billing",
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
                return Billing::fromJson($json);
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
     * Billable usage over a range (the current billing month by default), per meter, dimension and bucket (`hour`, `day` or `month`, UTC), oldest first; with `group_by=environment`, per environment too. Only live environments are billed, so only they appear. Usage counts when it becomes billable (an email when the provider accepts it) and is kept for 400 days.
     *
     * Example:
     * ```php
     * $client->billing->usage(
     *     new UsageBillingRequest([]),
     * );
     * ```
     *
     * @param UsageBillingRequest $request
     * @param ?array{
     *   baseUrl?: string,
     *   maxRetries?: int,
     *   timeout?: float,
     *   headers?: array<string, string>,
     *   queryParameters?: array<string, mixed>,
     *   bodyProperties?: array<string, mixed>,
     * } $options
     * @return ?UsageList
     * @throws CossException
     * @throws CossApiException
     */
    public function usage(UsageBillingRequest $request = new UsageBillingRequest(), ?array $options = null): ?UsageList
    {
        $options = array_merge($this->options, $options ?? []);
        $query = [];
        if ($request->from != null) {
            $query['from'] = JsonSerializer::serializeDateTime($request->from);
        }
        if ($request->to != null) {
            $query['to'] = JsonSerializer::serializeDateTime($request->to);
        }
        if ($request->granularity != null) {
            $query['granularity'] = $request->granularity;
        }
        if ($request->groupBy != null) {
            $query['group_by'] = $request->groupBy;
        }
        if ($request->meter != null) {
            $query['meter'] = $request->meter;
        }
        try {
            $response = $this->client->sendRequest(
                new JsonApiRequest(
                    baseUrl: $options['baseUrl'] ?? $this->client->options['baseUrl'] ?? Environments::Default_->value,
                    path: "v1/billing/usage",
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
                return UsageList::fromJson($json);
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
