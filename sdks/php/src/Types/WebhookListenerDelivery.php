<?php

namespace Coss\Types;

use Coss\Core\Json\JsonSerializableType;
use Coss\Core\Json\JsonProperty;
use DateTime;
use Coss\Core\Types\Date;

class WebhookListenerDelivery extends JsonSerializableType
{
    /**
     * @var value-of<WebhookListenerDeliveryObject> $object
     */
    #[JsonProperty('object')]
    public string $object;

    /**
     * @var string $id
     */
    #[JsonProperty('id')]
    public string $id;

    /**
     * @var string $ackToken Send it back with the delivery's acknowledgement in a later poll.
     */
    #[JsonProperty('ack_token')]
    public string $ackToken;

    /**
     * @var string $eventId The event's id: the `id` of the body, and the `webhook-id` header endpoints receive.
     */
    #[JsonProperty('event_id')]
    public string $eventId;

    /**
     * @var string $eventType
     */
    #[JsonProperty('event_type')]
    public string $eventType;

    /**
     * @var int $attempt How many polls have handed it out: more than 1 when an earlier answer was never acknowledged.
     */
    #[JsonProperty('attempt')]
    public int $attempt;

    /**
     * @var string $body The event body, exactly as an endpoint with the listener's API version would receive it.
     */
    #[JsonProperty('body')]
    public string $body;

    /**
     * @var DateTime $createdAt
     */
    #[JsonProperty('created_at'), Date(Date::TYPE_DATETIME)]
    public DateTime $createdAt;

    /**
     * @param array{
     *   object: value-of<WebhookListenerDeliveryObject>,
     *   id: string,
     *   ackToken: string,
     *   eventId: string,
     *   eventType: string,
     *   attempt: int,
     *   body: string,
     *   createdAt: DateTime,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->object = $values['object'];
        $this->id = $values['id'];
        $this->ackToken = $values['ackToken'];
        $this->eventId = $values['eventId'];
        $this->eventType = $values['eventType'];
        $this->attempt = $values['attempt'];
        $this->body = $values['body'];
        $this->createdAt = $values['createdAt'];
    }

    /**
     * @return string
     */
    public function __toString(): string
    {
        return $this->toJson();
    }
}
