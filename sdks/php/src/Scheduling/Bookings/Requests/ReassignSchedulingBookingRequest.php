<?php

namespace Coss\Scheduling\Bookings\Requests;

use Coss\Core\Json\JsonSerializableType;
use Coss\Scheduling\Bookings\Types\ReassignSchedulingBookingRequestChangesItem;
use Coss\Core\Json\JsonProperty;
use Coss\Core\Types\ArrayType;
use Coss\Scheduling\Bookings\Types\ReassignSchedulingBookingRequestReasonCode;
use Coss\Scheduling\Bookings\Types\ReassignSchedulingBookingRequestOverridesItem;
use Coss\Scheduling\Bookings\Types\ReassignSchedulingBookingRequestNotify;

class ReassignSchedulingBookingRequest extends JsonSerializableType
{
    /**
     * @var array<ReassignSchedulingBookingRequestChangesItem> $changes A session or a one-on-one has one. A collective can change several.
     */
    #[JsonProperty('changes'), ArrayType([ReassignSchedulingBookingRequestChangesItem::class])]
    public array $changes;

    /**
     * @var value-of<ReassignSchedulingBookingRequestReasonCode> $reasonCode
     */
    #[JsonProperty('reason_code')]
    public string $reasonCode;

    /**
     * @var ?string $note Why, in your words: required with an override of someone's availability. Encrypted, and only in the booking's history.
     */
    #[JsonProperty('note')]
    public ?string $note;

    /**
     * @var ?array<value-of<ReassignSchedulingBookingRequestOverridesItem>> $overrides Go ahead anyway: `any_host` for someone who doesn't take this event type, and the rest for what a candidate's `reason` said. A host who already has something at this time can never be overridden.
     */
    #[JsonProperty('overrides'), ArrayType(['string'])]
    public ?array $overrides;

    /**
     * @var ?ReassignSchedulingBookingRequestNotify $notify
     */
    #[JsonProperty('notify')]
    public ?ReassignSchedulingBookingRequestNotify $notify;

    /**
     * @param array{
     *   changes: array<ReassignSchedulingBookingRequestChangesItem>,
     *   reasonCode: value-of<ReassignSchedulingBookingRequestReasonCode>,
     *   note?: ?string,
     *   overrides?: ?array<value-of<ReassignSchedulingBookingRequestOverridesItem>>,
     *   notify?: ?ReassignSchedulingBookingRequestNotify,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->changes = $values['changes'];
        $this->reasonCode = $values['reasonCode'];
        $this->note = $values['note'] ?? null;
        if (array_key_exists('note', $values)) {
            $this->_setField('note');
        }
        $this->overrides = $values['overrides'] ?? null;
        if (array_key_exists('overrides', $values)) {
            $this->_setField('overrides');
        }
        $this->notify = $values['notify'] ?? null;
        if (array_key_exists('notify', $values)) {
            $this->_setField('notify');
        }
    }
}
