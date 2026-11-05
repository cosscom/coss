<?php

namespace Coss\Scheduling\Reassignments\Requests;

use Coss\Core\Json\JsonSerializableType;
use Coss\Types\SchedulingReassignmentSelection;
use Coss\Core\Json\JsonProperty;
use Coss\Types\SchedulingReassignmentStrategy;
use Coss\Scheduling\Reassignments\Types\CreateSchedulingReassignmentRequestReasonCode;
use Coss\Scheduling\Reassignments\Types\CreateSchedulingReassignmentRequestOverridesItem;
use Coss\Core\Types\ArrayType;
use Coss\Scheduling\Reassignments\Types\CreateSchedulingReassignmentRequestNotify;

class CreateSchedulingReassignmentRequest extends JsonSerializableType
{
    /**
     * @var ?string $idempotencyKey Makes retries safe: a repeated request with the same key and body returns the original run instead of starting another, for 24 hours. 1-256 characters.
     */
    public ?string $idempotencyKey;

    /**
     * @var SchedulingReassignmentSelection $selection
     */
    #[JsonProperty('selection')]
    public SchedulingReassignmentSelection $selection;

    /**
     * @var ?SchedulingReassignmentStrategy $strategy
     */
    #[JsonProperty('strategy')]
    public ?SchedulingReassignmentStrategy $strategy;

    /**
     * @var value-of<CreateSchedulingReassignmentRequestReasonCode> $reasonCode
     */
    #[JsonProperty('reason_code')]
    public string $reasonCode;

    /**
     * @var ?string $note Why, in your words: required with an override of someone's availability.
     */
    #[JsonProperty('note')]
    public ?string $note;

    /**
     * @var ?array<value-of<CreateSchedulingReassignmentRequestOverridesItem>> $overrides
     */
    #[JsonProperty('overrides'), ArrayType(['string'])]
    public ?array $overrides;

    /**
     * @var ?CreateSchedulingReassignmentRequestNotify $notify
     */
    #[JsonProperty('notify')]
    public ?CreateSchedulingReassignmentRequestNotify $notify;

    /**
     * @param array{
     *   selection: SchedulingReassignmentSelection,
     *   reasonCode: value-of<CreateSchedulingReassignmentRequestReasonCode>,
     *   idempotencyKey?: ?string,
     *   strategy?: ?SchedulingReassignmentStrategy,
     *   note?: ?string,
     *   overrides?: ?array<value-of<CreateSchedulingReassignmentRequestOverridesItem>>,
     *   notify?: ?CreateSchedulingReassignmentRequestNotify,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->idempotencyKey = $values['idempotencyKey'] ?? null;
        if (array_key_exists('idempotencyKey', $values)) {
            $this->_setField('idempotencyKey');
        }
        $this->selection = $values['selection'];
        $this->strategy = $values['strategy'] ?? null;
        if (array_key_exists('strategy', $values)) {
            $this->_setField('strategy');
        }
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
