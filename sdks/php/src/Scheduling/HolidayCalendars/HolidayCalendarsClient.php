<?php

namespace Coss\Scheduling\HolidayCalendars;

use Psr\Http\Client\ClientInterface;
use Coss\Core\Client\RawClient;
use Coss\Types\SchedulingHolidayCalendarList;
use Coss\Exceptions\CossException;
use Coss\Exceptions\CossApiException;
use Coss\Core\Json\JsonApiRequest;
use Coss\Environments;
use Coss\Core\Client\HttpMethod;
use JsonException;
use Psr\Http\Client\ClientExceptionInterface;
use Coss\Scheduling\HolidayCalendars\Requests\CreateSchedulingHolidayCalendarRequest;
use Coss\Types\SchedulingHolidayCalendar;
use Coss\Core\Client\IdempotencyKey;
use Coss\Types\DeletedSchedulingHolidayCalendar;
use Coss\Scheduling\HolidayCalendars\Requests\UpdateSchedulingHolidayCalendarRequest;
use Coss\Types\SchedulingHolidayList;

class HolidayCalendarsClient
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
     * By name. A feed's URL is never shown again.
     *
     * Example:
     * ```php
     * $client->scheduling->holidayCalendars->list();
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
     * @return ?SchedulingHolidayCalendarList
     * @throws CossException
     * @throws CossApiException
     */
    public function list(?array $options = null): ?SchedulingHolidayCalendarList
    {
        $options = array_merge($this->options, $options ?? []);
        try {
            $response = $this->client->sendRequest(
                new JsonApiRequest(
                    baseUrl: $options['baseUrl'] ?? $this->client->options['baseUrl'] ?? Environments::Default_->value,
                    path: "v1/scheduling/holiday_calendars",
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
                return SchedulingHolidayCalendarList::fromJson($json);
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
     * Applies a country's public holidays, or your own feed, to some hosts as ordinary out of office entries, kept up to date by coss.com. A host who removes one keeps it removed.
     *
     * Example:
     * ```php
     * $client->scheduling->holidayCalendars->create(
     *     new CreateSchedulingHolidayCalendarRequest([
     *         'name' => 'UK team',
     *         'country' => 'GB',
     *         'hostFilter' => [
     *             'team' => 'london',
     *         ],
     *     ]),
     * );
     * ```
     *
     * @param CreateSchedulingHolidayCalendarRequest $request
     * @param ?array{
     *   baseUrl?: string,
     *   maxRetries?: int,
     *   timeout?: float,
     *   headers?: array<string, string>,
     *   queryParameters?: array<string, mixed>,
     *   bodyProperties?: array<string, mixed>,
     * } $options
     * @return ?SchedulingHolidayCalendar
     * @throws CossException
     * @throws CossApiException
     */
    public function create(CreateSchedulingHolidayCalendarRequest $request, ?array $options = null): ?SchedulingHolidayCalendar
    {
        $options = array_merge($this->options, $options ?? []);
        $options['maxRetries'] = 0;
        $headers = [];
        $headers['Idempotency-Key'] ??= IdempotencyKey::generate();
        try {
            $response = $this->client->sendRequest(
                new JsonApiRequest(
                    baseUrl: $options['baseUrl'] ?? $this->client->options['baseUrl'] ?? Environments::Default_->value,
                    path: "v1/scheduling/holiday_calendars",
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
                return SchedulingHolidayCalendar::fromJson($json);
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
     * With when it was last read, and why not if it couldn't be.
     *
     * Example:
     * ```php
     * $client->scheduling->holidayCalendars->get(
     *     'id',
     * );
     * ```
     *
     * @param string $id The holiday calendar's id.
     * @param ?array{
     *   baseUrl?: string,
     *   maxRetries?: int,
     *   timeout?: float,
     *   headers?: array<string, string>,
     *   queryParameters?: array<string, mixed>,
     *   bodyProperties?: array<string, mixed>,
     * } $options
     * @return ?SchedulingHolidayCalendar
     * @throws CossException
     * @throws CossApiException
     */
    public function get(string $id, ?array $options = null): ?SchedulingHolidayCalendar
    {
        $options = array_merge($this->options, $options ?? []);
        try {
            $response = $this->client->sendRequest(
                new JsonApiRequest(
                    baseUrl: $options['baseUrl'] ?? $this->client->options['baseUrl'] ?? Environments::Default_->value,
                    path: "v1/scheduling/holiday_calendars/" . RawClient::encodePathParam($id),
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
                return SchedulingHolidayCalendar::fromJson($json);
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
     * Hosts can be booked on its days again, shortly: past entries stay.
     *
     * Example:
     * ```php
     * $client->scheduling->holidayCalendars->remove(
     *     'id',
     * );
     * ```
     *
     * @param string $id The holiday calendar's id.
     * @param ?array{
     *   baseUrl?: string,
     *   maxRetries?: int,
     *   timeout?: float,
     *   headers?: array<string, string>,
     *   queryParameters?: array<string, mixed>,
     *   bodyProperties?: array<string, mixed>,
     * } $options
     * @return ?DeletedSchedulingHolidayCalendar
     * @throws CossException
     * @throws CossApiException
     */
    public function remove(string $id, ?array $options = null): ?DeletedSchedulingHolidayCalendar
    {
        $options = array_merge($this->options, $options ?? []);
        try {
            $response = $this->client->sendRequest(
                new JsonApiRequest(
                    baseUrl: $options['baseUrl'] ?? $this->client->options['baseUrl'] ?? Environments::Default_->value,
                    path: "v1/scheduling/holiday_calendars/" . RawClient::encodePathParam($id),
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
                return DeletedSchedulingHolidayCalendar::fromJson($json);
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
     * Who it applies to, who covers and what happens to bookings. Takes effect shortly.
     *
     * Example:
     * ```php
     * $client->scheduling->holidayCalendars->update(
     *     'id',
     *     new UpdateSchedulingHolidayCalendarRequest([
     *         'hostFilter' => [
     *             'team' => 'london',
     *         ],
     *     ]),
     * );
     * ```
     *
     * @param string $id The holiday calendar's id.
     * @param UpdateSchedulingHolidayCalendarRequest $request
     * @param ?array{
     *   baseUrl?: string,
     *   maxRetries?: int,
     *   timeout?: float,
     *   headers?: array<string, string>,
     *   queryParameters?: array<string, mixed>,
     *   bodyProperties?: array<string, mixed>,
     * } $options
     * @return ?SchedulingHolidayCalendar
     * @throws CossException
     * @throws CossApiException
     */
    public function update(string $id, UpdateSchedulingHolidayCalendarRequest $request = new UpdateSchedulingHolidayCalendarRequest(), ?array $options = null): ?SchedulingHolidayCalendar
    {
        $options = array_merge($this->options, $options ?? []);
        try {
            $response = $this->client->sendRequest(
                new JsonApiRequest(
                    baseUrl: $options['baseUrl'] ?? $this->client->options['baseUrl'] ?? Environments::Default_->value,
                    path: "v1/scheduling/holiday_calendars/" . RawClient::encodePathParam($id),
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
                return SchedulingHolidayCalendar::fromJson($json);
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
     * What's coming, with names, as last read. Empty until its first read.
     *
     * Example:
     * ```php
     * $client->scheduling->holidayCalendars->holidays(
     *     'id',
     * );
     * ```
     *
     * @param string $id The holiday calendar's id.
     * @param ?array{
     *   baseUrl?: string,
     *   maxRetries?: int,
     *   timeout?: float,
     *   headers?: array<string, string>,
     *   queryParameters?: array<string, mixed>,
     *   bodyProperties?: array<string, mixed>,
     * } $options
     * @return ?SchedulingHolidayList
     * @throws CossException
     * @throws CossApiException
     */
    public function holidays(string $id, ?array $options = null): ?SchedulingHolidayList
    {
        $options = array_merge($this->options, $options ?? []);
        try {
            $response = $this->client->sendRequest(
                new JsonApiRequest(
                    baseUrl: $options['baseUrl'] ?? $this->client->options['baseUrl'] ?? Environments::Default_->value,
                    path: "v1/scheduling/holiday_calendars/" . RawClient::encodePathParam($id) . "/holidays",
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
                return SchedulingHolidayList::fromJson($json);
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
