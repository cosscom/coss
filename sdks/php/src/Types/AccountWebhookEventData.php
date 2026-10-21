<?php

namespace Coss\Types;

use Coss\Core\Json\JsonSerializableType;
use Coss\Core\Json\JsonProperty;
use DateTime;
use Coss\Core\Types\Date;
use Coss\Core\Types\ArrayType;

class AccountWebhookEventData extends JsonSerializableType
{
    /**
     * @var string $organizationId
     */
    #[JsonProperty('organization_id')]
    public string $organizationId;

    /**
     * @var value-of<AccountWebhookEventDataStatus> $status
     */
    #[JsonProperty('status')]
    public string $status;

    /**
     * @var value-of<AccountWebhookEventDataPreviousStatus> $previousStatus
     */
    #[JsonProperty('previous_status')]
    public string $previousStatus;

    /**
     * @var ?string $reason
     */
    #[JsonProperty('reason')]
    public ?string $reason;

    /**
     * @var DateTime $occurredAt
     */
    #[JsonProperty('occurred_at'), Date(Date::TYPE_DATETIME)]
    public DateTime $occurredAt;

    /**
     * @var array<ReputationCheck> $checks
     */
    #[JsonProperty('checks'), ArrayType([ReputationCheck::class])]
    public array $checks;

    /**
     * @var MarketingStanding $marketing
     */
    #[JsonProperty('marketing')]
    public MarketingStanding $marketing;

    /**
     * @param array{
     *   organizationId: string,
     *   status: value-of<AccountWebhookEventDataStatus>,
     *   previousStatus: value-of<AccountWebhookEventDataPreviousStatus>,
     *   occurredAt: DateTime,
     *   checks: array<ReputationCheck>,
     *   marketing: MarketingStanding,
     *   reason?: ?string,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->organizationId = $values['organizationId'];
        $this->status = $values['status'];
        $this->previousStatus = $values['previousStatus'];
        $this->reason = $values['reason'] ?? null;
        if (array_key_exists('reason', $values)) {
            $this->_setField('reason');
        }
        $this->occurredAt = $values['occurredAt'];
        $this->checks = $values['checks'];
        $this->marketing = $values['marketing'];
    }

    /**
     * @return string
     */
    public function __toString(): string
    {
        return $this->toJson();
    }
}
