<?php

namespace Coss\Types;

use Coss\Core\Json\JsonSerializableType;
use Coss\Core\Json\JsonProperty;

class SchedulingReassignmentWebhookEventData extends JsonSerializableType
{
    /**
     * @var string $reassignmentId
     */
    #[JsonProperty('reassignment_id')]
    public string $reassignmentId;

    /**
     * @var value-of<SchedulingReassignmentWebhookEventDataStatus> $status
     */
    #[JsonProperty('status')]
    public string $status;

    /**
     * @var ?string $outOfOfficeId
     */
    #[JsonProperty('out_of_office_id')]
    public ?string $outOfOfficeId;

    /**
     * @var SchedulingReassignmentWebhookEventDataCounts $counts
     */
    #[JsonProperty('counts')]
    public SchedulingReassignmentWebhookEventDataCounts $counts;

    /**
     * @var string $occurredAt
     */
    #[JsonProperty('occurred_at')]
    public string $occurredAt;

    /**
     * @param array{
     *   reassignmentId: string,
     *   status: value-of<SchedulingReassignmentWebhookEventDataStatus>,
     *   counts: SchedulingReassignmentWebhookEventDataCounts,
     *   occurredAt: string,
     *   outOfOfficeId?: ?string,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->reassignmentId = $values['reassignmentId'];
        $this->status = $values['status'];
        $this->outOfOfficeId = $values['outOfOfficeId'] ?? null;
        if (array_key_exists('outOfOfficeId', $values)) {
            $this->_setField('outOfOfficeId');
        }
        $this->counts = $values['counts'];
        $this->occurredAt = $values['occurredAt'];
    }

    /**
     * @return string
     */
    public function __toString(): string
    {
        return $this->toJson();
    }
}
