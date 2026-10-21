<?php

namespace Coss\Types;

use Coss\Core\Json\JsonSerializableType;
use Coss\Core\Json\JsonProperty;
use DateTime;
use Coss\Core\Types\Date;

class MarketingStanding extends JsonSerializableType
{
    /**
     * @var value-of<MarketingStandingStatus> $status `active`, or `paused`: the marketing stream's bounce or complaint rate reached its suspension threshold, so marketing sends are refused until coss.com support lifts the pause. Transactional email is unaffected.
     */
    #[JsonProperty('status')]
    public string $status;

    /**
     * @var ?string $reason The trigger behind a pause.
     */
    #[JsonProperty('reason')]
    public ?string $reason;

    /**
     * @var ?DateTime $pausedAt
     */
    #[JsonProperty('paused_at'), Date(Date::TYPE_DATETIME)]
    public ?DateTime $pausedAt;

    /**
     * @param array{
     *   status: value-of<MarketingStandingStatus>,
     *   reason?: ?string,
     *   pausedAt?: ?DateTime,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->status = $values['status'];
        $this->reason = $values['reason'] ?? null;
        $this->pausedAt = $values['pausedAt'] ?? null;
    }

    /**
     * @return string
     */
    public function __toString(): string
    {
        return $this->toJson();
    }
}
