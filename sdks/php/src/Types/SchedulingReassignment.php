<?php

namespace Coss\Types;

use Coss\Core\Json\JsonSerializableType;
use Coss\Core\Json\JsonProperty;

class SchedulingReassignment extends JsonSerializableType
{
    /**
     * @var value-of<SchedulingReassignmentObject> $object
     */
    #[JsonProperty('object')]
    public string $object;

    /**
     * @var string $id
     */
    #[JsonProperty('id')]
    public string $id;

    /**
     * @var value-of<SchedulingReassignmentStatus> $status
     */
    #[JsonProperty('status')]
    public string $status;

    /**
     * @var value-of<SchedulingReassignmentReasonCode> $reasonCode
     */
    #[JsonProperty('reason_code')]
    public string $reasonCode;

    /**
     * @var ?string $outOfOffice
     */
    #[JsonProperty('out_of_office')]
    public ?string $outOfOffice;

    /**
     * @var ?string $undoOf
     */
    #[JsonProperty('undo_of')]
    public ?string $undoOf;

    /**
     * @var SchedulingReassignmentCounts $counts
     */
    #[JsonProperty('counts')]
    public SchedulingReassignmentCounts $counts;

    /**
     * @var string $createdAt
     */
    #[JsonProperty('created_at')]
    public string $createdAt;

    /**
     * @var ?string $startedAt
     */
    #[JsonProperty('started_at')]
    public ?string $startedAt;

    /**
     * @var ?string $finishedAt
     */
    #[JsonProperty('finished_at')]
    public ?string $finishedAt;

    /**
     * @param array{
     *   object: value-of<SchedulingReassignmentObject>,
     *   id: string,
     *   status: value-of<SchedulingReassignmentStatus>,
     *   reasonCode: value-of<SchedulingReassignmentReasonCode>,
     *   counts: SchedulingReassignmentCounts,
     *   createdAt: string,
     *   outOfOffice?: ?string,
     *   undoOf?: ?string,
     *   startedAt?: ?string,
     *   finishedAt?: ?string,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->object = $values['object'];
        $this->id = $values['id'];
        $this->status = $values['status'];
        $this->reasonCode = $values['reasonCode'];
        $this->outOfOffice = $values['outOfOffice'] ?? null;
        if (array_key_exists('outOfOffice', $values)) {
            $this->_setField('outOfOffice');
        }
        $this->undoOf = $values['undoOf'] ?? null;
        if (array_key_exists('undoOf', $values)) {
            $this->_setField('undoOf');
        }
        $this->counts = $values['counts'];
        $this->createdAt = $values['createdAt'];
        $this->startedAt = $values['startedAt'] ?? null;
        if (array_key_exists('startedAt', $values)) {
            $this->_setField('startedAt');
        }
        $this->finishedAt = $values['finishedAt'] ?? null;
        if (array_key_exists('finishedAt', $values)) {
            $this->_setField('finishedAt');
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
