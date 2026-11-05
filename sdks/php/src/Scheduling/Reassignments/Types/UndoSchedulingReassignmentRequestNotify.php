<?php

namespace Coss\Scheduling\Reassignments\Types;

use Coss\Core\Json\JsonSerializableType;
use Coss\Core\Json\JsonProperty;

class UndoSchedulingReassignmentRequestNotify extends JsonSerializableType
{
    /**
     * @var ?bool $attendees Tell attendees. Default: true.
     */
    #[JsonProperty('attendees')]
    public ?bool $attendees;

    /**
     * @var ?value-of<UndoSchedulingReassignmentRequestNotifyHosts> $hosts `digest` (the default) sends each host one email for the run.
     */
    #[JsonProperty('hosts')]
    public ?string $hosts;

    /**
     * @param array{
     *   attendees?: ?bool,
     *   hosts?: ?value-of<UndoSchedulingReassignmentRequestNotifyHosts>,
     * } $values
     */
    public function __construct(
        array $values = [],
    ) {
        $this->attendees = $values['attendees'] ?? null;
        if (array_key_exists('attendees', $values)) {
            $this->_setField('attendees');
        }
        $this->hosts = $values['hosts'] ?? null;
        if (array_key_exists('hosts', $values)) {
            $this->_setField('hosts');
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
