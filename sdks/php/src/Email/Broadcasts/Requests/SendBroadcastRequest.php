<?php

namespace Coss\Email\Broadcasts\Requests;

use Coss\Core\Json\JsonSerializableType;
use DateTime;
use Coss\Core\Json\JsonProperty;
use Coss\Core\Types\Date;

class SendBroadcastRequest extends JsonSerializableType
{
    /**
     * @var ?DateTime $scheduledAt Omit to start right away.
     */
    #[JsonProperty('scheduled_at'), Date(Date::TYPE_DATETIME)]
    public ?DateTime $scheduledAt;

    /**
     * @param array{
     *   scheduledAt?: ?DateTime,
     * } $values
     */
    public function __construct(
        array $values = [],
    ) {
        $this->scheduledAt = $values['scheduledAt'] ?? null;
        if (array_key_exists('scheduledAt', $values)) {
            $this->_setField('scheduledAt');
        }
    }
}
