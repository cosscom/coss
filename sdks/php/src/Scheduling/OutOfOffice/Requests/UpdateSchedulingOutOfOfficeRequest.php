<?php

namespace Coss\Scheduling\OutOfOffice\Requests;

use Coss\Core\Json\JsonSerializableType;
use Coss\Core\Json\JsonProperty;
use Coss\Core\Types\ArrayType;
use Coss\Scheduling\OutOfOffice\Types\UpdateSchedulingOutOfOfficeRequestExistingBookings;
use Coss\Scheduling\OutOfOffice\Types\UpdateSchedulingOutOfOfficeRequestReassign;

class UpdateSchedulingOutOfOfficeRequest extends JsonSerializableType
{
    /**
     * @var ?string $start An ISO 8601 instant with an offset.
     */
    #[JsonProperty('start')]
    public ?string $start;

    /**
     * @var ?string $end An ISO 8601 instant with an offset.
     */
    #[JsonProperty('end')]
    public ?string $end;

    /**
     * @var ?string $startDate The first whole day away. Use instead of `start` and `end`.
     */
    #[JsonProperty('start_date')]
    public ?string $startDate;

    /**
     * @var ?string $endDate The last whole day away, which is included.
     */
    #[JsonProperty('end_date')]
    public ?string $endDate;

    /**
     * @var ?string $timeZone What the dates mean in. Default: the host's zone when this is made.
     */
    #[JsonProperty('time_zone')]
    public ?string $timeZone;

    /**
     * @var ?string $reason One of `unspecified`, `vacation`, `travel`, `sick`, `public_holiday`, `parental_leave`, `training` and `other`, or a key from the settings' `out_of_office_reasons`. Only people who manage this host see it: never bookers, webhooks or calendars.
     */
    #[JsonProperty('reason')]
    public ?string $reason;

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
     * @var ?bool $showOnCalendar
     */
    #[JsonProperty('show_on_calendar')]
    public ?bool $showOnCalendar;

    /**
     * @var ?array<string> $delegates Who can be booked in this host's place during it, by id or uid, in the order to try them. They still have to fit how a booking's routed.
     */
    #[JsonProperty('delegates'), ArrayType(['string'])]
    public ?array $delegates;

    /**
     * @var ?value-of<UpdateSchedulingOutOfOfficeRequestExistingBookings> $existingBookings What happens to bookings already in the way. `leave` (the default) only reports them. `reassign` moves them, and any nobody can take stay where they are.
     */
    #[JsonProperty('existing_bookings')]
    public ?string $existingBookings;

    /**
     * @var ?UpdateSchedulingOutOfOfficeRequestReassign $reassign With `existing_bookings: reassign`: who they go to. Default: the fairest who's free.
     */
    #[JsonProperty('reassign')]
    public ?UpdateSchedulingOutOfOfficeRequestReassign $reassign;

    /**
     * @param array{
     *   start?: ?string,
     *   end?: ?string,
     *   startDate?: ?string,
     *   endDate?: ?string,
     *   timeZone?: ?string,
     *   reason?: ?string,
     *   notes?: ?string,
     *   publicMessage?: ?string,
     *   showOnCalendar?: ?bool,
     *   delegates?: ?array<string>,
     *   existingBookings?: ?value-of<UpdateSchedulingOutOfOfficeRequestExistingBookings>,
     *   reassign?: ?UpdateSchedulingOutOfOfficeRequestReassign,
     * } $values
     */
    public function __construct(
        array $values = [],
    ) {
        $this->start = $values['start'] ?? null;
        if (array_key_exists('start', $values)) {
            $this->_setField('start');
        }
        $this->end = $values['end'] ?? null;
        if (array_key_exists('end', $values)) {
            $this->_setField('end');
        }
        $this->startDate = $values['startDate'] ?? null;
        if (array_key_exists('startDate', $values)) {
            $this->_setField('startDate');
        }
        $this->endDate = $values['endDate'] ?? null;
        if (array_key_exists('endDate', $values)) {
            $this->_setField('endDate');
        }
        $this->timeZone = $values['timeZone'] ?? null;
        if (array_key_exists('timeZone', $values)) {
            $this->_setField('timeZone');
        }
        $this->reason = $values['reason'] ?? null;
        if (array_key_exists('reason', $values)) {
            $this->_setField('reason');
        }
        $this->notes = $values['notes'] ?? null;
        if (array_key_exists('notes', $values)) {
            $this->_setField('notes');
        }
        $this->publicMessage = $values['publicMessage'] ?? null;
        if (array_key_exists('publicMessage', $values)) {
            $this->_setField('publicMessage');
        }
        $this->showOnCalendar = $values['showOnCalendar'] ?? null;
        if (array_key_exists('showOnCalendar', $values)) {
            $this->_setField('showOnCalendar');
        }
        $this->delegates = $values['delegates'] ?? null;
        if (array_key_exists('delegates', $values)) {
            $this->_setField('delegates');
        }
        $this->existingBookings = $values['existingBookings'] ?? null;
        if (array_key_exists('existingBookings', $values)) {
            $this->_setField('existingBookings');
        }
        $this->reassign = $values['reassign'] ?? null;
        if (array_key_exists('reassign', $values)) {
            $this->_setField('reassign');
        }
    }
}
