<?php

namespace Coss\Types;

use Coss\Core\Json\JsonSerializableType;
use Coss\Core\Json\JsonProperty;
use Coss\Core\Types\ArrayType;

class SchedulingReassignmentSelection extends JsonSerializableType
{
    /**
     * @var ?string $host This host's bookings, by id or uid.
     */
    #[JsonProperty('host')]
    public ?string $host;

    /**
     * @var ?string $outOfOffice The bookings that fall in this entry.
     */
    #[JsonProperty('out_of_office')]
    public ?string $outOfOffice;

    /**
     * @var ?array<string> $bookingIds
     */
    #[JsonProperty('booking_ids'), ArrayType(['string'])]
    public ?array $bookingIds;

    /**
     * @var ?string $series A series' occurrences still to come.
     */
    #[JsonProperty('series')]
    public ?string $series;

    /**
     * @var ?string $startAfter An ISO 8601 instant with an offset.
     */
    #[JsonProperty('start_after')]
    public ?string $startAfter;

    /**
     * @var ?string $startBefore An ISO 8601 instant with an offset.
     */
    #[JsonProperty('start_before')]
    public ?string $startBefore;

    /**
     * @var ?array<string> $eventTypes
     */
    #[JsonProperty('event_types'), ArrayType(['string'])]
    public ?array $eventTypes;

    /**
     * @var ?bool $externalConflict Only those with something else on the host's calendar at that time.
     */
    #[JsonProperty('external_conflict')]
    public ?bool $externalConflict;

    /**
     * @param array{
     *   host?: ?string,
     *   outOfOffice?: ?string,
     *   bookingIds?: ?array<string>,
     *   series?: ?string,
     *   startAfter?: ?string,
     *   startBefore?: ?string,
     *   eventTypes?: ?array<string>,
     *   externalConflict?: ?bool,
     * } $values
     */
    public function __construct(
        array $values = [],
    ) {
        $this->host = $values['host'] ?? null;
        if (array_key_exists('host', $values)) {
            $this->_setField('host');
        }
        $this->outOfOffice = $values['outOfOffice'] ?? null;
        if (array_key_exists('outOfOffice', $values)) {
            $this->_setField('outOfOffice');
        }
        $this->bookingIds = $values['bookingIds'] ?? null;
        if (array_key_exists('bookingIds', $values)) {
            $this->_setField('bookingIds');
        }
        $this->series = $values['series'] ?? null;
        if (array_key_exists('series', $values)) {
            $this->_setField('series');
        }
        $this->startAfter = $values['startAfter'] ?? null;
        if (array_key_exists('startAfter', $values)) {
            $this->_setField('startAfter');
        }
        $this->startBefore = $values['startBefore'] ?? null;
        if (array_key_exists('startBefore', $values)) {
            $this->_setField('startBefore');
        }
        $this->eventTypes = $values['eventTypes'] ?? null;
        if (array_key_exists('eventTypes', $values)) {
            $this->_setField('eventTypes');
        }
        $this->externalConflict = $values['externalConflict'] ?? null;
        if (array_key_exists('externalConflict', $values)) {
            $this->_setField('externalConflict');
        }
    }

    /**
     * @return string
     */
    public function __toString(): string
    {
        return $this->toJson();
    }
}
