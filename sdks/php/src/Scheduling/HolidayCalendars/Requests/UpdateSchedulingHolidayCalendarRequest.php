<?php

namespace Coss\Scheduling\HolidayCalendars\Requests;

use Coss\Core\Json\JsonSerializableType;
use Coss\Core\Json\JsonProperty;
use Coss\Core\Types\ArrayType;
use Coss\Core\Types\Union;
use Coss\Scheduling\HolidayCalendars\Types\UpdateSchedulingHolidayCalendarRequestExistingBookings;

class UpdateSchedulingHolidayCalendarRequest extends JsonSerializableType
{
    /**
     * @var ?string $name
     */
    #[JsonProperty('name')]
    public ?string $name;

    /**
     * @var ?array<string> $hosts These hosts, by id or uid.
     */
    #[JsonProperty('hosts'), ArrayType(['string'])]
    public ?array $hosts;

    /**
     * @var ?array<string, (
     *    string
     *   |array<string>
     * )> $hostFilter Everyone matching these attributes, asked again at every sync.
     */
    #[JsonProperty('host_filter'), ArrayType(['string' => new Union('string', ['string'])])]
    public ?array $hostFilter;

    /**
     * @var ?array<string> $regions Which regional holidays apply, matched against how the calendar names them, such as `England`. Without this, all of them do; empty, only nationwide ones.
     */
    #[JsonProperty('regions'), ArrayType(['string'])]
    public ?array $regions;

    /**
     * @var ?array<string> $delegates Who can be booked in their place on those days, by id or uid, in order.
     */
    #[JsonProperty('delegates'), ArrayType(['string'])]
    public ?array $delegates;

    /**
     * @var ?value-of<UpdateSchedulingHolidayCalendarRequestExistingBookings> $existingBookings What happens to bookings already on a holiday. `leave` (the default) only reports them. `reassign` moves them.
     */
    #[JsonProperty('existing_bookings')]
    public ?string $existingBookings;

    /**
     * @param array{
     *   name?: ?string,
     *   hosts?: ?array<string>,
     *   hostFilter?: ?array<string, (
     *    string
     *   |array<string>
     * )>,
     *   regions?: ?array<string>,
     *   delegates?: ?array<string>,
     *   existingBookings?: ?value-of<UpdateSchedulingHolidayCalendarRequestExistingBookings>,
     * } $values
     */
    public function __construct(
        array $values = [],
    ) {
        $this->name = $values['name'] ?? null;
        if (array_key_exists('name', $values)) {
            $this->_setField('name');
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
        $this->delegates = $values['delegates'] ?? null;
        if (array_key_exists('delegates', $values)) {
            $this->_setField('delegates');
        }
        $this->existingBookings = $values['existingBookings'] ?? null;
        if (array_key_exists('existingBookings', $values)) {
            $this->_setField('existingBookings');
        }
    }
}
