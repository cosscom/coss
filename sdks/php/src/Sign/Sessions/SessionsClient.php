<?php

namespace Coss\Sign\Sessions;

use Psr\Http\Client\ClientInterface;
use Coss\Core\Client\RawClient;
use Coss\Sign\Sessions\Requests\CreateSignSessionRequest;
use Coss\Types\SignSession;
use Coss\Exceptions\CossException;
use Coss\Exceptions\CossApiException;
use Coss\Core\Client\IdempotencyKey;
use Coss\Core\Json\JsonApiRequest;
use Coss\Environments;
use Coss\Core\Client\HttpMethod;
use JsonException;
use Psr\Http\Client\ClientExceptionInterface;

class SessionsClient
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
     * A short-lived link to the signing page for one `embedded` signer of a sent request. Your app vouches for who the signer is (the audit trail records `customer_asserted`), so create it only for that signed-in user, when they open the page that shows it. Embed the `url` in an iframe from an origin in your Sign settings' `allowed_origins` (`mountSigning` from `coss/sign` does it), or redirect to it. Each call creates a new session.
     *
     * Example:
     * ```php
     * $client->sign->sessions->create(
     *     'sreq_01k7c8m4q2f3e9v6t5r1n0p8yz',
     *     'ssgn_01k7c8m4q2f3e9v6t5r1n0p8yz',
     *     new CreateSignSessionRequest([
     *         'expiresIn' => 3600,
     *     ]),
     * );
     * ```
     *
     * @param string $id The signature request's id.
     * @param string $signerId The signer's id (`signers[].id` of the request).
     * @param CreateSignSessionRequest $request
     * @param ?array{
     *   baseUrl?: string,
     *   maxRetries?: int,
     *   timeout?: float,
     *   headers?: array<string, string>,
     *   queryParameters?: array<string, mixed>,
     *   bodyProperties?: array<string, mixed>,
     * } $options
     * @return ?SignSession
     * @throws CossException
     * @throws CossApiException
     */
    public function create(string $id, string $signerId, CreateSignSessionRequest $request = new CreateSignSessionRequest(), ?array $options = null): ?SignSession
    {
        $options = array_merge($this->options, $options ?? []);
        $headers = [];
        $headers['Idempotency-Key'] ??= IdempotencyKey::generate();
        try {
            $response = $this->client->sendRequest(
                new JsonApiRequest(
                    baseUrl: $options['baseUrl'] ?? $this->client->options['baseUrl'] ?? Environments::Default_->value,
                    path: "v1/sign/requests/" . RawClient::encodePathParam($id) . "/signers/" . RawClient::encodePathParam($signerId) . "/sessions",
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
                return SignSession::fromJson($json);
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
