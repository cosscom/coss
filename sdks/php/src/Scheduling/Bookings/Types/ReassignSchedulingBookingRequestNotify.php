<?php

namespace Coss\Scheduling\Bookings\Types;

use Coss\Core\Json\JsonSerializableType;
use Coss\Core\Json\JsonProperty;

class ReassignSchedulingBookingRequestNotify extends JsonSerializableType
{
    /**
     * @var ?bool $attendee Tell the attendee. Default: true.
     */
    #[JsonProperty('attendee')]
    public ?bool $attendee;

    /**
     * @param array{
     *   attendee?: ?bool,
     * } $values
     */
    public function __construct(
        array $values = [],
    ) {
        $this->attendee = $values['attendee'] ?? null;
        if (array_key_exists('attendee', $values)) {
            $this->_setField('attendee');
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
