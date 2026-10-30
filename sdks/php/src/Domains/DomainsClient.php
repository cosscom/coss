<?php

namespace Coss\Domains;

use Coss\Domains\Tracking\TrackingClient;
use Coss\Domains\Receiving\ReceivingClient;
use Coss\Domains\Dmarc\DmarcClient;
use Psr\Http\Client\ClientInterface;
use Coss\Core\Client\RawClient;
use Coss\Domains\Requests\ListDomainsRequest;
use Coss\Types\DomainList;
use Coss\Exceptions\CossException;
use Coss\Exceptions\CossApiException;
use Coss\Core\Json\JsonApiRequest;
use Coss\Environments;
use Coss\Core\Client\HttpMethod;
use JsonException;
use Psr\Http\Client\ClientExceptionInterface;
use Coss\Domains\Requests\CreateDomainRequest;
use Coss\Types\Domain;
use Coss\Core\Client\IdempotencyKey;
use Coss\Types\DeletedDomain;
use Coss\Domains\Requests\UpdateDomainRequest;

class DomainsClient
{
    /**
     * @var TrackingClient $tracking
     */
    public TrackingClient $tracking;

    /**
     * @var ReceivingClient $receiving
     */
    public ReceivingClient $receiving;

    /**
     * @var DmarcClient $dmarc
     */
    public DmarcClient $dmarc;

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
        $this->tracking = new TrackingClient($this->client, $this->options);
        $this->receiving = new ReceivingClient($this->client, $this->options);
        $this->dmarc = new DmarcClient($this->client, $this->options);
    }

    /**
     * Every domain of the organization, ordered by name. Domains belong to the organization, not to one environment, so every API key of the organization sees the same domains.
     *
     * Example:
     * ```php
     * $client->domains->list(
     *     new ListDomainsRequest([]),
     * );
     * ```
     *
     * @param ListDomainsRequest $request
     * @param ?array{
     *   baseUrl?: string,
     *   maxRetries?: int,
     *   timeout?: float,
     *   headers?: array<string, string>,
     *   queryParameters?: array<string, mixed>,
     *   bodyProperties?: array<string, mixed>,
     * } $options
     * @return ?DomainList
     * @throws CossException
     * @throws CossApiException
     */
    public function list(ListDomainsRequest $request = new ListDomainsRequest(), ?array $options = null): ?DomainList
    {
        $options = array_merge($this->options, $options ?? []);
        $query = [];
        if ($request->subaccount != null) {
            $query['subaccount'] = $request->subaccount;
        }
        try {
            $response = $this->client->sendRequest(
                new JsonApiRequest(
                    baseUrl: $options['baseUrl'] ?? $this->client->options['baseUrl'] ?? Environments::Default_->value,
                    path: "v1/domains",
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
                return DomainList::fromJson($json);
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
     * Claims the domain for the organization and returns the DNS records to publish. Domains belong to the organization, not to one environment, so every API key of the organization sees the same domains. The records are checked repeatedly in the background and verification gives up after 72 hours; until the domain is `verified`, live keys cannot send from it.
     *
     * Example:
     * ```php
     * $client->domains->create(
     *     new CreateDomainRequest([
     *         'name' => 'acme.com',
     *     ]),
     * );
     * ```
     *
     * @param CreateDomainRequest $request
     * @param ?array{
     *   baseUrl?: string,
     *   maxRetries?: int,
     *   timeout?: float,
     *   headers?: array<string, string>,
     *   queryParameters?: array<string, mixed>,
     *   bodyProperties?: array<string, mixed>,
     * } $options
     * @return ?Domain
     * @throws CossException
     * @throws CossApiException
     */
    public function create(CreateDomainRequest $request, ?array $options = null): ?Domain
    {
        $options = array_merge($this->options, $options ?? []);
        $headers = [];
        $headers['Idempotency-Key'] ??= IdempotencyKey::generate();
        try {
            $response = $this->client->sendRequest(
                new JsonApiRequest(
                    baseUrl: $options['baseUrl'] ?? $this->client->options['baseUrl'] ?? Environments::Default_->value,
                    path: "v1/domains",
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
                return Domain::fromJson($json);
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
     * The domain with the result of the last DNS check, so you can show which records are still missing or mismatched.
     *
     * Example:
     * ```php
     * $client->domains->get(
     *     'dom_01k7c8m4q2f3e9v6t5r1n0p8yz',
     * );
     * ```
     *
     * @param string $id The domain's id.
     * @param ?array{
     *   baseUrl?: string,
     *   maxRetries?: int,
     *   timeout?: float,
     *   headers?: array<string, string>,
     *   queryParameters?: array<string, mixed>,
     *   bodyProperties?: array<string, mixed>,
     * } $options
     * @return ?Domain
     * @throws CossException
     * @throws CossApiException
     */
    public function get(string $id, ?array $options = null): ?Domain
    {
        $options = array_merge($this->options, $options ?? []);
        try {
            $response = $this->client->sendRequest(
                new JsonApiRequest(
                    baseUrl: $options['baseUrl'] ?? $this->client->options['baseUrl'] ?? Environments::Default_->value,
                    path: "v1/domains/" . RawClient::encodePathParam($id),
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
                return Domain::fromJson($json);
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
     * Removes the domain and its provider identity. Emails already sent are unaffected, but live keys can no longer send from it and the name becomes available again.
     *
     * Example:
     * ```php
     * $client->domains->delete(
     *     'dom_01k7c8m4q2f3e9v6t5r1n0p8yz',
     * );
     * ```
     *
     * @param string $id The domain's id.
     * @param ?array{
     *   baseUrl?: string,
     *   maxRetries?: int,
     *   timeout?: float,
     *   headers?: array<string, string>,
     *   queryParameters?: array<string, mixed>,
     *   bodyProperties?: array<string, mixed>,
     * } $options
     * @return ?DeletedDomain
     * @throws CossException
     * @throws CossApiException
     */
    public function delete(string $id, ?array $options = null): ?DeletedDomain
    {
        $options = array_merge($this->options, $options ?? []);
        try {
            $response = $this->client->sendRequest(
                new JsonApiRequest(
                    baseUrl: $options['baseUrl'] ?? $this->client->options['baseUrl'] ?? Environments::Default_->value,
                    path: "v1/domains/" . RawClient::encodePathParam($id),
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
                return DeletedDomain::fromJson($json);
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
     * Shares one of the organization's own domains with its sub-accounts (they may then send from it, through the organization's reputation), or stops sharing it.
     *
     * Example:
     * ```php
     * $client->domains->update(
     *     'dom_01k7c8m4q2f3e9v6t5r1n0p8yz',
     *     new UpdateDomainRequest([
     *         'sharedWithSubaccounts' => true,
     *     ]),
     * );
     * ```
     *
     * @param string $id The domain's id.
     * @param UpdateDomainRequest $request
     * @param ?array{
     *   baseUrl?: string,
     *   maxRetries?: int,
     *   timeout?: float,
     *   headers?: array<string, string>,
     *   queryParameters?: array<string, mixed>,
     *   bodyProperties?: array<string, mixed>,
     * } $options
     * @return ?Domain
     * @throws CossException
     * @throws CossApiException
     */
    public function update(string $id, UpdateDomainRequest $request, ?array $options = null): ?Domain
    {
        $options = array_merge($this->options, $options ?? []);
        try {
            $response = $this->client->sendRequest(
                new JsonApiRequest(
                    baseUrl: $options['baseUrl'] ?? $this->client->options['baseUrl'] ?? Environments::Default_->value,
                    path: "v1/domains/" . RawClient::encodePathParam($id),
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
                return Domain::fromJson($json);
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
     * Asks the delivery provider and DNS about the domain immediately instead of waiting for the next background check, and returns the updated domain. A `failed` domain starts verification over with fresh DKIM records, which have to be published again. Its tracking domain, if any, is checked too (and set up again if it `failed`).
     *
     * Example:
     * ```php
     * $client->domains->verify(
     *     'dom_01k7c8m4q2f3e9v6t5r1n0p8yz',
     * );
     * ```
     *
     * @param string $id The domain's id.
     * @param ?array{
     *   baseUrl?: string,
     *   maxRetries?: int,
     *   timeout?: float,
     *   headers?: array<string, string>,
     *   queryParameters?: array<string, mixed>,
     *   bodyProperties?: array<string, mixed>,
     * } $options
     * @return ?Domain
     * @throws CossException
     * @throws CossApiException
     */
    public function verify(string $id, ?array $options = null): ?Domain
    {
        $options = array_merge($this->options, $options ?? []);
        $headers = [];
        $headers['Idempotency-Key'] ??= IdempotencyKey::generate();
        try {
            $response = $this->client->sendRequest(
                new JsonApiRequest(
                    baseUrl: $options['baseUrl'] ?? $this->client->options['baseUrl'] ?? Environments::Default_->value,
                    path: "v1/domains/" . RawClient::encodePathParam($id) . "/verify",
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
                return Domain::fromJson($json);
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
