<?php

namespace Coss\Types;

use Coss\Core\Json\JsonSerializableType;
use Coss\Core\Json\JsonProperty;
use Coss\Core\Types\ArrayType;

class WebhookListenerPoll extends JsonSerializableType
{
    /**
     * @var value-of<WebhookListenerPollObject> $object
     */
    #[JsonProperty('object')]
    public string $object;

    /**
     * @var WebhookListener $listener
     */
    #[JsonProperty('listener')]
    public WebhookListener $listener;

    /**
     * @var array<WebhookListenerDelivery> $deliveries Events to forward, oldest first. Empty when none arrived while the poll waited. A delivery not acknowledged within two minutes is handed out again.
     */
    #[JsonProperty('deliveries'), ArrayType([WebhookListenerDelivery::class])]
    public array $deliveries;

    /**
     * @var int $acknowledged How many of the request's acknowledgements were recorded.
     */
    #[JsonProperty('acknowledged')]
    public int $acknowledged;

    /**
     * @param array{
     *   object: value-of<WebhookListenerPollObject>,
     *   listener: WebhookListener,
     *   deliveries: array<WebhookListenerDelivery>,
     *   acknowledged: int,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->object = $values['object'];
        $this->listener = $values['listener'];
        $this->deliveries = $values['deliveries'];
        $this->acknowledged = $values['acknowledged'];
    }

    /**
     * @return string
     */
    public function __toString(): string
    {
        return $this->toJson();
    }
}
