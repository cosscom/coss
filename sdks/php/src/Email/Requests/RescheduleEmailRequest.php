<?php

namespace Coss\Email\Requests;

use Coss\Core\Json\JsonSerializableType;
use DateTime;
use Coss\Core\Json\JsonProperty;
use Coss\Core\Types\Date;

class RescheduleEmailRequest extends JsonSerializableType
{
    /**
     * @var DateTime $scheduledAt The new time to send the email at (ISO 8601 with an offset, at most 30 days ahead). A time that is not in the future sends it right away.
     */
    #[JsonProperty('scheduled_at'), Date(Date::TYPE_DATETIME)]
    public DateTime $scheduledAt;

    /**
     * @param array{
     *   scheduledAt: DateTime,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->scheduledAt = $values['scheduledAt'];
    }
}
