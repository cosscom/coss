<?php

namespace Coss\Scheduling\Reassignments;

use Psr\Http\Client\ClientInterface;
use Coss\Core\Client\RawClient;
use Coss\Scheduling\Reassignments\Requests\PreviewSchedulingReassignmentRequest;
use Coss\Types\SchedulingReassignmentPreview;
use Coss\Exceptions\CossException;
use Coss\Exceptions\CossApiException;
use Coss\Core\Client\IdempotencyKey;
use Coss\Core\Json\JsonApiRequest;
use Coss\Environments;
use Coss\Core\Client\HttpMethod;
use JsonException;
use Psr\Http\Client\ClientExceptionInterface;
use Coss\Scheduling\Reassignments\Requests\ListReassignmentsRequest;
use Coss\Types\SchedulingReassignmentList;
use Coss\Scheduling\Reassignments\Requests\CreateSchedulingReassignmentRequest;
use Coss\Types\SchedulingReassignment;
use Coss\Scheduling\Reassignments\Requests\ItemsReassignmentsRequest;
use Coss\Types\SchedulingReassignmentItemList;
use Coss\Scheduling\Reassignments\Requests\UndoSchedulingReassignmentRequest;

class ReassignmentsClient
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
     * Who each booking would go to, and why not when nobody can take it, without moving anything. It works down them in order, so two can't both be promised the same free hour. Change any of it and start the run with `assignments`. Covers the first 500. Things can change before you start it: the run decides again.
     *
     * Example:
     * ```php
     * $client->scheduling->reassignments->preview(
     *     new PreviewSchedulingReassignmentRequest([
     *         'selection' => new SchedulingReassignmentSelection([
     *             'host' => 'doctor_482',
     *             'startBefore' => '2027-08-14T00:00:00.000Z',
     *         ]),
     *         'strategy' => new SchedulingReassignmentStrategy([
     *             'preferredHosts' => [
     *                 'doctor_518',
     *             ],
     *         ]),
     *     ]),
     * );
     * ```
     *
     * @param PreviewSchedulingReassignmentRequest $request
     * @param ?array{
     *   baseUrl?: string,
     *   maxRetries?: int,
     *   timeout?: float,
     *   headers?: array<string, string>,
     *   queryParameters?: array<string, mixed>,
     *   bodyProperties?: array<string, mixed>,
     * } $options
     * @return ?SchedulingReassignmentPreview
     * @throws CossException
     * @throws CossApiException
     */
    public function preview(PreviewSchedulingReassignmentRequest $request, ?array $options = null): ?SchedulingReassignmentPreview
    {
        $options = array_merge($this->options, $options ?? []);
        $headers = [];
        $headers['Idempotency-Key'] ??= IdempotencyKey::generate();
        try {
            $response = $this->client->sendRequest(
                new JsonApiRequest(
                    baseUrl: $options['baseUrl'] ?? $this->client->options['baseUrl'] ?? Environments::Default_->value,
                    path: "v1/scheduling/reassignments/preview",
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
                return SchedulingReassignmentPreview::fromJson($json);
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
     * Newest first, with how each is going.
     *
     * Example:
     * ```php
     * $client->scheduling->reassignments->list(
     *     new ListReassignmentsRequest([]),
     * );
     * ```
     *
     * @param ListReassignmentsRequest $request
     * @param ?array{
     *   baseUrl?: string,
     *   maxRetries?: int,
     *   timeout?: float,
     *   headers?: array<string, string>,
     *   queryParameters?: array<string, mixed>,
     *   bodyProperties?: array<string, mixed>,
     * } $options
     * @return ?SchedulingReassignmentList
     * @throws CossException
     * @throws CossApiException
     */
    public function list(ListReassignmentsRequest $request = new ListReassignmentsRequest(), ?array $options = null): ?SchedulingReassignmentList
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
                    path: "v1/scheduling/reassignments",
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
                return SchedulingReassignmentList::fromJson($json);
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
     * Moves up to 5,000 bookings in the background, each on its own, so one that can't move never holds up the rest. Nothing's ever cancelled: a booking nobody can take stays where it is, and its item says so. It answers at once: follow the run by its id, or wait for `scheduling.reassignment.completed`.
     *
     * Example:
     * ```php
     * $client->scheduling->reassignments->create(
     *     new CreateSchedulingReassignmentRequest([
     *         'idempotencyKey' => 'welcome-user-123',
     *         'selection' => new SchedulingReassignmentSelection([
     *             'outOfOffice' => 'ooo_01kd2m9a0b1c2d3e4f5g6h7j8m',
     *         ]),
     *         'strategy' => new SchedulingReassignmentStrategy([
     *             'preferredHosts' => [
     *                 'doctor_518',
     *             ],
     *         ]),
     *         'reasonCode' => CreateSchedulingReassignmentRequestReasonCode::OutOfOffice->value,
     *     ]),
     * );
     * ```
     *
     * @param CreateSchedulingReassignmentRequest $request
     * @param ?array{
     *   baseUrl?: string,
     *   maxRetries?: int,
     *   timeout?: float,
     *   headers?: array<string, string>,
     *   queryParameters?: array<string, mixed>,
     *   bodyProperties?: array<string, mixed>,
     * } $options
     * @return ?SchedulingReassignment
     * @throws CossException
     * @throws CossApiException
     */
    public function create(CreateSchedulingReassignmentRequest $request, ?array $options = null): ?SchedulingReassignment
    {
        $options = array_merge($this->options, $options ?? []);
        $headers = [];
        if ($request->idempotencyKey != null) {
            $headers['Idempotency-Key'] = $request->idempotencyKey;
        }
        $headers['Idempotency-Key'] ??= IdempotencyKey::generate();
        try {
            $response = $this->client->sendRequest(
                new JsonApiRequest(
                    baseUrl: $options['baseUrl'] ?? $this->client->options['baseUrl'] ?? Environments::Default_->value,
                    path: "v1/scheduling/reassignments",
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
                return SchedulingReassignment::fromJson($json);
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
     * How it's going.
     *
     * Example:
     * ```php
     * $client->scheduling->reassignments->get(
     *     'id',
     * );
     * ```
     *
     * @param string $id The reassignment's id.
     * @param ?array{
     *   baseUrl?: string,
     *   maxRetries?: int,
     *   timeout?: float,
     *   headers?: array<string, string>,
     *   queryParameters?: array<string, mixed>,
     *   bodyProperties?: array<string, mixed>,
     * } $options
     * @return ?SchedulingReassignment
     * @throws CossException
     * @throws CossApiException
     */
    public function get(string $id, ?array $options = null): ?SchedulingReassignment
    {
        $options = array_merge($this->options, $options ?? []);
        try {
            $response = $this->client->sendRequest(
                new JsonApiRequest(
                    baseUrl: $options['baseUrl'] ?? $this->client->options['baseUrl'] ?? Environments::Default_->value,
                    path: "v1/scheduling/reassignments/" . RawClient::encodePathParam($id),
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
                return SchedulingReassignment::fromJson($json);
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
     * Each booking it covers and what happened to it. A group session has one, for one of its seats. Empty until the worker's started on it.
     *
     * Example:
     * ```php
     * $client->scheduling->reassignments->items(
     *     'id',
     *     new ItemsReassignmentsRequest([]),
     * );
     * ```
     *
     * @param string $id The reassignment's id.
     * @param ItemsReassignmentsRequest $request
     * @param ?array{
     *   baseUrl?: string,
     *   maxRetries?: int,
     *   timeout?: float,
     *   headers?: array<string, string>,
     *   queryParameters?: array<string, mixed>,
     *   bodyProperties?: array<string, mixed>,
     * } $options
     * @return ?SchedulingReassignmentItemList
     * @throws CossException
     * @throws CossApiException
     */
    public function items(string $id, ItemsReassignmentsRequest $request = new ItemsReassignmentsRequest(), ?array $options = null): ?SchedulingReassignmentItemList
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
                    path: "v1/scheduling/reassignments/" . RawClient::encodePathParam($id) . "/items",
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
                return SchedulingReassignmentItemList::fromJson($json);
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
     * Stops what hasn't happened yet. What's moved stays moved: undo it for that. Cancelling one that's finished changes nothing.
     *
     * Example:
     * ```php
     * $client->scheduling->reassignments->cancel(
     *     'id',
     * );
     * ```
     *
     * @param string $id The reassignment's id.
     * @param ?array{
     *   baseUrl?: string,
     *   maxRetries?: int,
     *   timeout?: float,
     *   headers?: array<string, string>,
     *   queryParameters?: array<string, mixed>,
     *   bodyProperties?: array<string, mixed>,
     * } $options
     * @return ?SchedulingReassignment
     * @throws CossException
     * @throws CossApiException
     */
    public function cancel(string $id, ?array $options = null): ?SchedulingReassignment
    {
        $options = array_merge($this->options, $options ?? []);
        $headers = [];
        $headers['Idempotency-Key'] ??= IdempotencyKey::generate();
        try {
            $response = $this->client->sendRequest(
                new JsonApiRequest(
                    baseUrl: $options['baseUrl'] ?? $this->client->options['baseUrl'] ?? Environments::Default_->value,
                    path: "v1/scheduling/reassignments/" . RawClient::encodePathParam($id) . "/cancel",
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
                return SchedulingReassignment::fromJson($json);
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
     * Gives back what a finished run moved, as a new run. A booking that's moved on since stays where it went, and a former host who's no longer free keeps it from going back, unless you pass `overrides`.
     *
     * Example:
     * ```php
     * $client->scheduling->reassignments->undo(
     *     'id',
     *     new UndoSchedulingReassignmentRequest([
     *         'reasonCode' => UndoSchedulingReassignmentRequestReasonCode::Other->value,
     *     ]),
     * );
     * ```
     *
     * @param string $id The reassignment's id.
     * @param UndoSchedulingReassignmentRequest $request
     * @param ?array{
     *   baseUrl?: string,
     *   maxRetries?: int,
     *   timeout?: float,
     *   headers?: array<string, string>,
     *   queryParameters?: array<string, mixed>,
     *   bodyProperties?: array<string, mixed>,
     * } $options
     * @return ?SchedulingReassignment
     * @throws CossException
     * @throws CossApiException
     */
    public function undo(string $id, UndoSchedulingReassignmentRequest $request = new UndoSchedulingReassignmentRequest(), ?array $options = null): ?SchedulingReassignment
    {
        $options = array_merge($this->options, $options ?? []);
        $options['maxRetries'] = 0;
        $headers = [];
        $headers['Idempotency-Key'] ??= IdempotencyKey::generate();
        try {
            $response = $this->client->sendRequest(
                new JsonApiRequest(
                    baseUrl: $options['baseUrl'] ?? $this->client->options['baseUrl'] ?? Environments::Default_->value,
                    path: "v1/scheduling/reassignments/" . RawClient::encodePathParam($id) . "/undo",
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
                return SchedulingReassignment::fromJson($json);
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
