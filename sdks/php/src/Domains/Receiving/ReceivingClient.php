<?php

namespace Coss\Domains\Receiving;

use Psr\Http\Client\ClientInterface;
use Coss\Core\Client\RawClient;
use Coss\Domains\Receiving\Requests\CreateReceivingDomainRequest;
use Coss\Types\Domain;
use Coss\Exceptions\CossException;
use Coss\Exceptions\CossApiException;
use Coss\Core\Client\IdempotencyKey;
use Coss\Core\Json\JsonApiRequest;
use Coss\Environments;
use Coss\Core\Client\HttpMethod;
use JsonException;
use Psr\Http\Client\ClientExceptionInterface;

class ReceivingClient
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
     * Starts receiving email at the domain itself or a subdomain (e.g. `inbound.acme.com`): email sent to any address at that hostname becomes a received email of the API key's environment (an `email.received` webhook, `GET /v1/received_emails`). Publish the MX record in `receiving.record`; coss.com checks it in the background. Using the domain itself moves all of its mail to coss.com. A domain has at most one receiving hostname: remove it to use another one.
     *
     * Example:
     * ```php
     * $client->domains->receiving->create(
     *     'dom_01k7c8m4q2f3e9v6t5r1n0p8yz',
     *     new CreateReceivingDomainRequest([
     *         'hostname' => 'inbound.acme.com',
     *     ]),
     * );
     * ```
     *
     * @param string $id The domain's id.
     * @param CreateReceivingDomainRequest $request
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
    public function create(string $id, CreateReceivingDomainRequest $request, ?array $options = null): ?Domain
    {
        $options = array_merge($this->options, $options ?? []);
        $headers = [];
        $headers['Idempotency-Key'] ??= IdempotencyKey::generate();
        try {
            $response = $this->client->sendRequest(
                new JsonApiRequest(
                    baseUrl: $options['baseUrl'] ?? $this->client->options['baseUrl'] ?? Environments::Default_->value,
                    path: "v1/domains/" . RawClient::encodePathParam($id) . "/receiving",
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
     * Stops receiving at the domain's receiving hostname: later mail to it is dropped (remove the MX record too). Emails already received stay until their retention ends.
     *
     * Example:
     * ```php
     * $client->domains->receiving->delete(
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
    public function delete(string $id, ?array $options = null): ?Domain
    {
        $options = array_merge($this->options, $options ?? []);
        try {
            $response = $this->client->sendRequest(
                new JsonApiRequest(
                    baseUrl: $options['baseUrl'] ?? $this->client->options['baseUrl'] ?? Environments::Default_->value,
                    path: "v1/domains/" . RawClient::encodePathParam($id) . "/receiving",
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
