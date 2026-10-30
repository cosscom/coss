<?php

namespace Coss\Types;

use Coss\Core\Json\JsonSerializableType;
use Coss\Core\Json\JsonProperty;
use DateTime;
use Coss\Core\Types\Date;
use Coss\Core\Types\ArrayType;

class SubaccountWebhookEventData extends JsonSerializableType
{
    /**
     * @var string $subaccountId
     */
    #[JsonProperty('subaccount_id')]
    public string $subaccountId;

    /**
     * @var ?string $uid
     */
    #[JsonProperty('uid')]
    public ?string $uid;

    /**
     * @var value-of<SubaccountWebhookEventDataStatus> $status
     */
    #[JsonProperty('status')]
    public string $status;

    /**
     * @var value-of<SubaccountWebhookEventDataPreviousStatus> $previousStatus
     */
    #[JsonProperty('previous_status')]
    public string $previousStatus;

    /**
     * @var ?string $trigger What changed it: a check (`bounce_rate`, `complaint_rate`), `content_screening` or `reinstated`.
     */
    #[JsonProperty('trigger')]
    public ?string $trigger;

    /**
     * @var DateTime $occurredAt
     */
    #[JsonProperty('occurred_at'), Date(Date::TYPE_DATETIME)]
    public DateTime $occurredAt;

    /**
     * @var array<ReputationCheck> $checks The measurements behind the change (empty for reinstatements and screening).
     */
    #[JsonProperty('checks'), ArrayType([ReputationCheck::class])]
    public array $checks;

    /**
     * @param array{
     *   subaccountId: string,
     *   status: value-of<SubaccountWebhookEventDataStatus>,
     *   previousStatus: value-of<SubaccountWebhookEventDataPreviousStatus>,
     *   occurredAt: DateTime,
     *   checks: array<ReputationCheck>,
     *   uid?: ?string,
     *   trigger?: ?string,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->subaccountId = $values['subaccountId'];
        $this->uid = $values['uid'] ?? null;
        if (array_key_exists('uid', $values)) {
            $this->_setField('uid');
        }
        $this->status = $values['status'];
        $this->previousStatus = $values['previousStatus'];
        $this->trigger = $values['trigger'] ?? null;
        if (array_key_exists('trigger', $values)) {
            $this->_setField('trigger');
        }
        $this->occurredAt = $values['occurredAt'];
        $this->checks = $values['checks'];
    }

    /**
     * @return string
     */
    public function __toString(): string
    {
        return $this->toJson();
    }
}
