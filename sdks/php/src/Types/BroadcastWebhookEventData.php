<?php

namespace Coss\Types;

use Coss\Core\Json\JsonSerializableType;
use Coss\Core\Json\JsonProperty;
use DateTime;
use Coss\Core\Types\Date;

class BroadcastWebhookEventData extends JsonSerializableType
{
    /**
     * @var BroadcastWebhookEventDataBroadcast $broadcast
     */
    #[JsonProperty('broadcast')]
    public BroadcastWebhookEventDataBroadcast $broadcast;

    /**
     * @var ?string $pauseReason
     */
    #[JsonProperty('pause_reason')]
    public ?string $pauseReason;

    /**
     * @var ?BroadcastWebhookEventDataError $error
     */
    #[JsonProperty('error')]
    public ?BroadcastWebhookEventDataError $error;

    /**
     * @var BroadcastStats $stats
     */
    #[JsonProperty('stats')]
    public BroadcastStats $stats;

    /**
     * @var DateTime $occurredAt
     */
    #[JsonProperty('occurred_at'), Date(Date::TYPE_DATETIME)]
    public DateTime $occurredAt;

    /**
     * @param array{
     *   broadcast: BroadcastWebhookEventDataBroadcast,
     *   stats: BroadcastStats,
     *   occurredAt: DateTime,
     *   pauseReason?: ?string,
     *   error?: ?BroadcastWebhookEventDataError,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->broadcast = $values['broadcast'];
        $this->pauseReason = $values['pauseReason'] ?? null;
        if (array_key_exists('pauseReason', $values)) {
            $this->_setField('pauseReason');
        }
        $this->error = $values['error'] ?? null;
        if (array_key_exists('error', $values)) {
            $this->_setField('error');
        }
        $this->stats = $values['stats'];
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
