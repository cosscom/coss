<?php

namespace Coss\Scheduling\OutOfOffice;

use Psr\Http\Client\ClientInterface;
use Coss\Core\Client\RawClient;
use Coss\Scheduling\OutOfOffice\Requests\ListOutOfOfficeRequest;
use Coss\Types\SchedulingOutOfOfficeList;
use Coss\Exceptions\CossException;
use Coss\Exceptions\CossApiException;
use Coss\Core\Json\JsonApiRequest;
use Coss\Environments;
use Coss\Core\Client\HttpMethod;
use JsonException;
use Psr\Http\Client\ClientExceptionInterface;
use Coss\Scheduling\OutOfOffice\Requests\CreateSchedulingOutOfOfficeRequest;
use Coss\Core\Client\IdempotencyKey;
use Coss\Types\SchedulingOutOfOffice;
use Coss\Types\DeletedSchedulingOutOfOffice;
use Coss\Scheduling\OutOfOffice\Requests\UpdateSchedulingOutOfOfficeRequest;
use Coss\Scheduling\OutOfOffice\Requests\PutSchedulingOutOfOfficeRequest;
use Coss\Scheduling\OutOfOffice\Requests\ConflictsOutOfOfficeRequest;
use Coss\Types\SchedulingOutOfOfficeConflictList;

class OutOfOfficeClient
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
     * The environment's entries, newest first.
     *
     * Example:
     * ```php
     * $client->scheduling->outOfOffice->list(
     *     new ListOutOfOfficeRequest([
     *         'startAfter' => '2027-01-04T15:00:00.000Z',
     *         'startBefore' => '2027-01-04T15:00:00.000Z',
     *     ]),
     * );
     * ```
     *
     * @param ListOutOfOfficeRequest $request
     * @param ?array{
     *   baseUrl?: string,
     *   maxRetries?: int,
     *   timeout?: float,
     *   headers?: array<string, string>,
     *   queryParameters?: array<string, mixed>,
     *   bodyProperties?: array<string, mixed>,
     * } $options
     * @return ?SchedulingOutOfOfficeList
     * @throws CossException
     * @throws CossApiException
     */
    public function list(ListOutOfOfficeRequest $request = new ListOutOfOfficeRequest(), ?array $options = null): ?SchedulingOutOfOfficeList
    {
        $options = array_merge($this->options, $options ?? []);
        $query = [];
        if ($request->limit != null) {
            $query['limit'] = $request->limit;
        }
        if ($request->after != null) {
            $query['after'] = $request->after;
        }
        if ($request->host != null) {
            $query['host'] = $request->host;
        }
        if ($request->startAfter != null) {
            $query['start_after'] = $request->startAfter;
        }
        if ($request->startBefore != null) {
            $query['start_before'] = $request->startBefore;
        }
        if ($request->group != null) {
            $query['group'] = $request->group;
        }
        try {
            $response = $this->client->sendRequest(
                new JsonApiRequest(
                    baseUrl: $options['baseUrl'] ?? $this->client->options['baseUrl'] ?? Environments::Default_->value,
                    path: "v1/scheduling/out_of_office",
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
                return SchedulingOutOfOfficeList::fromJson($json);
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
     * Marks one host, a list of hosts or everyone matching some attributes as away, for part of a day or for whole dates. They aren't offered during it. Existing bookings stay as they are: list them with the entry's conflicts.
     *
     * Example:
     * ```php
     * $client->scheduling->outOfOffice->create(
     *     new CreateSchedulingOutOfOfficeRequest([
     *         'host' => 'doctor_482',
     *         'startDate' => '2027-08-02',
     *         'endDate' => '2027-08-13',
     *         'reason' => 'vacation',
     *         'publicMessage' => 'Back on the 16th.',
     *     ]),
     * );
     * ```
     *
     * @param CreateSchedulingOutOfOfficeRequest $request
     * @param ?array{
     *   baseUrl?: string,
     *   maxRetries?: int,
     *   timeout?: float,
     *   headers?: array<string, string>,
     *   queryParameters?: array<string, mixed>,
     *   bodyProperties?: array<string, mixed>,
     * } $options
     * @return ?SchedulingOutOfOfficeList
     * @throws CossException
     * @throws CossApiException
     */
    public function create(CreateSchedulingOutOfOfficeRequest $request = new CreateSchedulingOutOfOfficeRequest(), ?array $options = null): ?SchedulingOutOfOfficeList
    {
        $options = array_merge($this->options, $options ?? []);
        $options['maxRetries'] = 0;
        $headers = [];
        $headers['Idempotency-Key'] ??= IdempotencyKey::generate();
        try {
            $response = $this->client->sendRequest(
                new JsonApiRequest(
                    baseUrl: $options['baseUrl'] ?? $this->client->options['baseUrl'] ?? Environments::Default_->value,
                    path: "v1/scheduling/out_of_office",
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
                return SchedulingOutOfOfficeList::fromJson($json);
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
     * One entry.
     *
     * Example:
     * ```php
     * $client->scheduling->outOfOffice->get(
     *     'ooo_01kd2m9a0b1c2d3e4f5g6h7j8m',
     * );
     * ```
     *
     * @param string $id The entry's id.
     * @param ?array{
     *   baseUrl?: string,
     *   maxRetries?: int,
     *   timeout?: float,
     *   headers?: array<string, string>,
     *   queryParameters?: array<string, mixed>,
     *   bodyProperties?: array<string, mixed>,
     * } $options
     * @return ?SchedulingOutOfOffice
     * @throws CossException
     * @throws CossApiException
     */
    public function get(string $id, ?array $options = null): ?SchedulingOutOfOffice
    {
        $options = array_merge($this->options, $options ?? []);
        try {
            $response = $this->client->sendRequest(
                new JsonApiRequest(
                    baseUrl: $options['baseUrl'] ?? $this->client->options['baseUrl'] ?? Environments::Default_->value,
                    path: "v1/scheduling/out_of_office/" . RawClient::encodePathParam($id),
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
                return SchedulingOutOfOffice::fromJson($json);
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
     * The host can be booked in that time again, and any calendar event for it goes.
     *
     * Example:
     * ```php
     * $client->scheduling->outOfOffice->remove(
     *     'ooo_01kd2m9a0b1c2d3e4f5g6h7j8m',
     * );
     * ```
     *
     * @param string $id The entry's id.
     * @param ?array{
     *   baseUrl?: string,
     *   maxRetries?: int,
     *   timeout?: float,
     *   headers?: array<string, string>,
     *   queryParameters?: array<string, mixed>,
     *   bodyProperties?: array<string, mixed>,
     * } $options
     * @return ?DeletedSchedulingOutOfOffice
     * @throws CossException
     * @throws CossApiException
     */
    public function remove(string $id, ?array $options = null): ?DeletedSchedulingOutOfOffice
    {
        $options = array_merge($this->options, $options ?? []);
        try {
            $response = $this->client->sendRequest(
                new JsonApiRequest(
                    baseUrl: $options['baseUrl'] ?? $this->client->options['baseUrl'] ?? Environments::Default_->value,
                    path: "v1/scheduling/out_of_office/" . RawClient::encodePathParam($id),
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
                return DeletedSchedulingOutOfOffice::fromJson($json);
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
     * Changes what's given. An entry stays with its host.
     *
     * Example:
     * ```php
     * $client->scheduling->outOfOffice->update(
     *     'ooo_01kd2m9a0b1c2d3e4f5g6h7j8m',
     *     new UpdateSchedulingOutOfOfficeRequest([
     *         'endDate' => '2027-08-20',
     *     ]),
     * );
     * ```
     *
     * @param string $id The entry's id.
     * @param UpdateSchedulingOutOfOfficeRequest $request
     * @param ?array{
     *   baseUrl?: string,
     *   maxRetries?: int,
     *   timeout?: float,
     *   headers?: array<string, string>,
     *   queryParameters?: array<string, mixed>,
     *   bodyProperties?: array<string, mixed>,
     * } $options
     * @return ?SchedulingOutOfOffice
     * @throws CossException
     * @throws CossApiException
     */
    public function update(string $id, UpdateSchedulingOutOfOfficeRequest $request = new UpdateSchedulingOutOfOfficeRequest(), ?array $options = null): ?SchedulingOutOfOffice
    {
        $options = array_merge($this->options, $options ?? []);
        try {
            $response = $this->client->sendRequest(
                new JsonApiRequest(
                    baseUrl: $options['baseUrl'] ?? $this->client->options['baseUrl'] ?? Environments::Default_->value,
                    path: "v1/scheduling/out_of_office/" . RawClient::encodePathParam($id),
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
                return SchedulingOutOfOffice::fromJson($json);
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
     * For syncing from a system of record such as an HR tool: send what it says, as often as you like, and there's one entry for it. Give every field you want to keep.
     *
     * Example:
     * ```php
     * $client->scheduling->outOfOffice->put(
     *     'hr_leave_4471',
     *     new PutSchedulingOutOfOfficeRequest([
     *         'host' => 'doctor_482',
     *         'startDate' => '2027-08-02',
     *         'endDate' => '2027-08-13',
     *         'reason' => 'vacation',
     *     ]),
     * );
     * ```
     *
     * @param string $externalId Your own id for the entry.
     * @param PutSchedulingOutOfOfficeRequest $request
     * @param ?array{
     *   baseUrl?: string,
     *   maxRetries?: int,
     *   timeout?: float,
     *   headers?: array<string, string>,
     *   queryParameters?: array<string, mixed>,
     *   bodyProperties?: array<string, mixed>,
     * } $options
     * @return ?SchedulingOutOfOffice
     * @throws CossException
     * @throws CossApiException
     */
    public function put(string $externalId, PutSchedulingOutOfOfficeRequest $request, ?array $options = null): ?SchedulingOutOfOffice
    {
        $options = array_merge($this->options, $options ?? []);
        try {
            $response = $this->client->sendRequest(
                new JsonApiRequest(
                    baseUrl: $options['baseUrl'] ?? $this->client->options['baseUrl'] ?? Environments::Default_->value,
                    path: "v1/scheduling/out_of_office/by_external_id/" . RawClient::encodePathParam($externalId),
                    method: HttpMethod::PUT,
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
                return SchedulingOutOfOffice::fromJson($json);
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
     * Live bookings of the host that fall in the entry, soonest first. Entries never change them.
     *
     * Example:
     * ```php
     * $client->scheduling->outOfOffice->conflicts(
     *     'ooo_01kd2m9a0b1c2d3e4f5g6h7j8m',
     *     new ConflictsOutOfOfficeRequest([]),
     * );
     * ```
     *
     * @param string $id The entry's id.
     * @param ConflictsOutOfOfficeRequest $request
     * @param ?array{
     *   baseUrl?: string,
     *   maxRetries?: int,
     *   timeout?: float,
     *   headers?: array<string, string>,
     *   queryParameters?: array<string, mixed>,
     *   bodyProperties?: array<string, mixed>,
     * } $options
     * @return ?SchedulingOutOfOfficeConflictList
     * @throws CossException
     * @throws CossApiException
     */
    public function conflicts(string $id, ConflictsOutOfOfficeRequest $request = new ConflictsOutOfOfficeRequest(), ?array $options = null): ?SchedulingOutOfOfficeConflictList
    {
        $options = array_merge($this->options, $options ?? []);
        $query = [];
        if ($request->limit != null) {
            $query['limit'] = $request->limit;
        }
        try {
            $response = $this->client->sendRequest(
                new JsonApiRequest(
                    baseUrl: $options['baseUrl'] ?? $this->client->options['baseUrl'] ?? Environments::Default_->value,
                    path: "v1/scheduling/out_of_office/" . RawClient::encodePathParam($id) . "/conflicts",
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
                return SchedulingOutOfOfficeConflictList::fromJson($json);
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
