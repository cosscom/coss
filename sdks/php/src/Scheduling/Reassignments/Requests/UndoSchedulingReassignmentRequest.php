<?php

namespace Coss\Scheduling\Reassignments\Requests;

use Coss\Core\Json\JsonSerializableType;
use Coss\Scheduling\Reassignments\Types\UndoSchedulingReassignmentRequestReasonCode;
use Coss\Core\Json\JsonProperty;
use Coss\Scheduling\Reassignments\Types\UndoSchedulingReassignmentRequestOverridesItem;
use Coss\Core\Types\ArrayType;
use Coss\Scheduling\Reassignments\Types\UndoSchedulingReassignmentRequestNotify;

class UndoSchedulingReassignmentRequest extends JsonSerializableType
{
    /**
     * @var ?value-of<UndoSchedulingReassignmentRequestReasonCode> $reasonCode
     */
    #[JsonProperty('reason_code')]
    public ?string $reasonCode;

    /**
     * @var ?string $note
     */
    #[JsonProperty('note')]
    public ?string $note;

    /**
     * @var ?array<value-of<UndoSchedulingReassignmentRequestOverridesItem>> $overrides
     */
    #[JsonProperty('overrides'), ArrayType(['string'])]
    public ?array $overrides;

    /**
     * @var ?UndoSchedulingReassignmentRequestNotify $notify
     */
    #[JsonProperty('notify')]
    public ?UndoSchedulingReassignmentRequestNotify $notify;

    /**
     * @param array{
     *   reasonCode?: ?value-of<UndoSchedulingReassignmentRequestReasonCode>,
     *   note?: ?string,
     *   overrides?: ?array<value-of<UndoSchedulingReassignmentRequestOverridesItem>>,
     *   notify?: ?UndoSchedulingReassignmentRequestNotify,
     * } $values
     */
    public function __construct(
        array $values = [],
    ) {
        $this->reasonCode = $values['reasonCode'] ?? null;
        if (array_key_exists('reasonCode', $values)) {
            $this->_setField('reasonCode');
        }
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
