<?php

namespace Coss\Types;

use Coss\Core\Json\JsonSerializableType;
use DateTime;
use Coss\Core\Json\JsonProperty;
use Coss\Core\Types\Date;

/**
 * Only for `email.rescheduled`.
 */
class EmailEventDataReschedule extends JsonSerializableType
{
    /**
     * @var DateTime $scheduledAt The new time.
     */
    #[JsonProperty('scheduled_at'), Date(Date::TYPE_DATETIME)]
    public DateTime $scheduledAt;

    /**
     * @var DateTime $previousScheduledAt The time it replaced.
     */
    #[JsonProperty('previous_scheduled_at'), Date(Date::TYPE_DATETIME)]
    public DateTime $previousScheduledAt;

    /**
     * @param array{
     *   scheduledAt: DateTime,
     *   previousScheduledAt: DateTime,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->scheduledAt = $values['scheduledAt'];
        $this->previousScheduledAt = $values['previousScheduledAt'];
    }

    /**
     * @return string
     */
    public function __toString(): string
    {
        return $this->toJson();
    }
}
