<?php

namespace Coss\Types;

use Coss\Core\Json\JsonSerializableType;
use Coss\Core\Json\JsonProperty;
use Coss\Core\Types\ArrayType;

class SchedulingOutOfOffice extends JsonSerializableType
{
    /**
     * @var value-of<SchedulingOutOfOfficeObject> $object
     */
    #[JsonProperty('object')]
    public string $object;

    /**
     * @var string $id
     */
    #[JsonProperty('id')]
    public string $id;

    /**
     * @var string $host
     */
    #[JsonProperty('host')]
    public string $host;

    /**
     * @var string $start
     */
    #[JsonProperty('start')]
    public string $start;

    /**
     * @var string $end
     */
    #[JsonProperty('end')]
    public string $end;

    /**
     * @var ?SchedulingOutOfOfficeAllDay $allDay How it was given, when it was as whole dates.
     */
    #[JsonProperty('all_day')]
    public ?SchedulingOutOfOfficeAllDay $allDay;

    /**
     * @var string $reason
     */
    #[JsonProperty('reason')]
    public string $reason;

    /**
     * @var ?string $notes
     */
    #[JsonProperty('notes')]
    public ?string $notes;

    /**
     * @var ?string $publicMessage
     */
    #[JsonProperty('public_message')]
    public ?string $publicMessage;

    /**
     * @var bool $showOnCalendar
     */
    #[JsonProperty('show_on_calendar')]
    public bool $showOnCalendar;

    /**
     * @var array<string> $delegates Who can be booked in their place.
     */
    #[JsonProperty('delegates'), ArrayType(['string'])]
    public array $delegates;

    /**
     * @var value-of<SchedulingOutOfOfficeExistingBookings> $existingBookings
     */
    #[JsonProperty('existing_bookings')]
    public string $existingBookings;

    /**
     * @var ?string $externalId
     */
    #[JsonProperty('external_id')]
    public ?string $externalId;

    /**
     * @var ?string $group Shared by the entries one request made for several hosts.
     */
    #[JsonProperty('group')]
    public ?string $group;

    /**
     * @var value-of<SchedulingOutOfOfficeSource> $source
     */
    #[JsonProperty('source')]
    public string $source;

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
     *   object: value-of<SchedulingOutOfOfficeObject>,
     *   id: string,
     *   host: string,
     *   start: string,
     *   end: string,
     *   reason: string,
     *   showOnCalendar: bool,
     *   delegates: array<string>,
     *   existingBookings: value-of<SchedulingOutOfOfficeExistingBookings>,
     *   source: value-of<SchedulingOutOfOfficeSource>,
     *   createdAt: string,
     *   updatedAt: string,
     *   allDay?: ?SchedulingOutOfOfficeAllDay,
     *   notes?: ?string,
     *   publicMessage?: ?string,
     *   externalId?: ?string,
     *   group?: ?string,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->object = $values['object'];
        $this->id = $values['id'];
        $this->host = $values['host'];
        $this->start = $values['start'];
        $this->end = $values['end'];
        $this->allDay = $values['allDay'] ?? null;
        if (array_key_exists('allDay', $values)) {
            $this->_setField('allDay');
        }
        $this->reason = $values['reason'];
        $this->notes = $values['notes'] ?? null;
        if (array_key_exists('notes', $values)) {
            $this->_setField('notes');
        }
        $this->publicMessage = $values['publicMessage'] ?? null;
        if (array_key_exists('publicMessage', $values)) {
            $this->_setField('publicMessage');
        }
        $this->showOnCalendar = $values['showOnCalendar'];
        $this->delegates = $values['delegates'];
        $this->existingBookings = $values['existingBookings'];
        $this->externalId = $values['externalId'] ?? null;
        if (array_key_exists('externalId', $values)) {
            $this->_setField('externalId');
        }
        $this->group = $values['group'] ?? null;
        if (array_key_exists('group', $values)) {
            $this->_setField('group');
        }
        $this->source = $values['source'];
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
