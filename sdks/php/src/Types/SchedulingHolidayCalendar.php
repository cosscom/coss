<?php

namespace Coss\Types;

use Coss\Core\Json\JsonSerializableType;
use Coss\Core\Json\JsonProperty;
use Coss\Core\Types\ArrayType;
use Coss\Core\Types\Union;

class SchedulingHolidayCalendar extends JsonSerializableType
{
    /**
     * @var value-of<SchedulingHolidayCalendarObject> $object
     */
    #[JsonProperty('object')]
    public string $object;

    /**
     * @var string $id
     */
    #[JsonProperty('id')]
    public string $id;

    /**
     * @var string $name
     */
    #[JsonProperty('name')]
    public string $name;

    /**
     * @var value-of<SchedulingHolidayCalendarSource> $source
     */
    #[JsonProperty('source')]
    public string $source;

    /**
     * @var ?string $country
     */
    #[JsonProperty('country')]
    public ?string $country;

    /**
     * @var ?array<string> $hosts
     */
    #[JsonProperty('hosts'), ArrayType(['string'])]
    public ?array $hosts;

    /**
     * @var ?array<string, (
     *    string
     *   |array<string>
     * )|null> $hostFilter
     */
    #[JsonProperty('host_filter'), ArrayType(['string' => new Union(new Union('string', ['string']), 'null')])]
    public ?array $hostFilter;

    /**
     * @var ?array<string> $regions
     */
    #[JsonProperty('regions'), ArrayType(['string'])]
    public ?array $regions;

    /**
     * @var array<string> $delegates
     */
    #[JsonProperty('delegates'), ArrayType(['string'])]
    public array $delegates;

    /**
     * @var value-of<SchedulingHolidayCalendarExistingBookings> $existingBookings
     */
    #[JsonProperty('existing_bookings')]
    public string $existingBookings;

    /**
     * @var ?string $lastReadAt
     */
    #[JsonProperty('last_read_at')]
    public ?string $lastReadAt;

    /**
     * @var ?string $lastError Why its feed couldn't be read.
     */
    #[JsonProperty('last_error')]
    public ?string $lastError;

    /**
     * @var string $createdAt
     */
    #[JsonProperty('created_at')]
    public string $createdAt;

    /**
     * @var string $updatedAt
     */
    #[JsonProperty('updated_at')]
    public string $updatedAt;

    /**
     * @param array{
     *   object: value-of<SchedulingHolidayCalendarObject>,
     *   id: string,
     *   name: string,
     *   source: value-of<SchedulingHolidayCalendarSource>,
     *   delegates: array<string>,
     *   existingBookings: value-of<SchedulingHolidayCalendarExistingBookings>,
     *   createdAt: string,
     *   updatedAt: string,
     *   country?: ?string,
     *   hosts?: ?array<string>,
     *   hostFilter?: ?array<string, (
     *    string
     *   |array<string>
     * )|null>,
     *   regions?: ?array<string>,
     *   lastReadAt?: ?string,
     *   lastError?: ?string,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->object = $values['object'];
        $this->id = $values['id'];
        $this->name = $values['name'];
        $this->source = $values['source'];
        $this->country = $values['country'] ?? null;
        if (array_key_exists('country', $values)) {
            $this->_setField('country');
        }
        $this->hosts = $values['hosts'] ?? null;
        if (array_key_exists('hosts', $values)) {
            $this->_setField('hosts');
        }
        $this->hostFilter = $values['hostFilter'] ?? null;
        if (array_key_exists('hostFilter', $values)) {
            $this->_setField('hostFilter');
        }
        $this->regions = $values['regions'] ?? null;
        if (array_key_exists('regions', $values)) {
            $this->_setField('regions');
        }
        $this->delegates = $values['delegates'];
        $this->existingBookings = $values['existingBookings'];
        $this->lastReadAt = $values['lastReadAt'] ?? null;
        if (array_key_exists('lastReadAt', $values)) {
            $this->_setField('lastReadAt');
        }
        $this->lastError = $values['lastError'] ?? null;
        if (array_key_exists('lastError', $values)) {
            $this->_setField('lastError');
        }
        $this->createdAt = $values['createdAt'];
        $this->updatedAt = $values['updatedAt'];
    }

    /**
     * @return string
     */
    public function __toString(): string
    {
        return $this->toJson();
    }
}
