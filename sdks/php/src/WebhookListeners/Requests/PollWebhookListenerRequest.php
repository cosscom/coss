<?php

namespace Coss\WebhookListeners\Requests;

use Coss\Core\Json\JsonSerializableType;
use Coss\Types\WebhookListenerAck;
use Coss\Core\Json\JsonProperty;
use Coss\Core\Types\ArrayType;

class PollWebhookListenerRequest extends JsonSerializableType
{
    /**
     * @var ?array<WebhookListenerAck> $acks What happened to deliveries handed out earlier. A delivery is finished once acknowledged: a 2xx status (or none, with no error) succeeds; anything else fails. Neither is retried.
     */
    #[JsonProperty('acks'), ArrayType([WebhookListenerAck::class])]
    public ?array $acks;

    /**
     * @var ?int $waitMs How long to wait for deliveries when none is pending, in milliseconds. Default 20000, at most 25000.
     */
    #[JsonProperty('wait_ms')]
    public ?int $waitMs;

    /**
     * @var ?int $limit The most deliveries to hand out. Default 10, at most 50.
     */
    #[JsonProperty('limit')]
    public ?int $limit;

    /**
     * @param array{
     *   acks?: ?array<WebhookListenerAck>,
     *   waitMs?: ?int,
     *   limit?: ?int,
     * } $values
     */
    public function __construct(
        array $values = [],
    ) {
        $this->acks = $values['acks'] ?? null;
        if (array_key_exists('acks', $values)) {
            $this->_setField('acks');
        }
        $this->waitMs = $values['waitMs'] ?? null;
        if (array_key_exists('waitMs', $values)) {
            $this->_setField('waitMs');
        }
        $this->limit = $values['limit'] ?? null;
        if (array_key_exists('limit', $values)) {
            $this->_setField('limit');
        }
    }
}
