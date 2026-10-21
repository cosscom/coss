<?php

namespace Coss\Types;

use Coss\Core\Json\JsonSerializableType;
use Coss\Core\Json\JsonProperty;
use DateTime;
use Coss\Core\Types\Date;
use Coss\Core\Types\ArrayType;

class WebhookDelivery extends JsonSerializableType
{
    /**
     * @var value-of<WebhookDeliveryObject> $object
     */
    #[JsonProperty('object')]
    public string $object;

    /**
     * @var string $id
     */
    #[JsonProperty('id')]
    public string $id;

    /**
     * @var string $endpointId
     */
    #[JsonProperty('endpoint_id')]
    public string $endpointId;

    /**
     * @var string $eventId The event's id: the `id` of the payload and the `webhook-id` header.
     */
    #[JsonProperty('event_id')]
    public string $eventId;

    /**
     * @var string $eventType
     */
    #[JsonProperty('event_type')]
    public string $eventType;

    /**
     * @var value-of<WebhookDeliveryStatus> $status
     */
    #[JsonProperty('status')]
    public string $status;

    /**
     * @var int $attemptCount
     */
    #[JsonProperty('attempt_count')]
    public int $attemptCount;

    /**
     * @var ?DateTime $nextAttemptAt When the next attempt is due; `null` once the delivery is finished.
     */
    #[JsonProperty('next_attempt_at'), Date(Date::TYPE_DATETIME)]
    public ?DateTime $nextAttemptAt;

    /**
     * @var ?int $lastStatusCode
     */
    #[JsonProperty('last_status_code')]
    public ?int $lastStatusCode;

    /**
     * @var ?string $lastError
     */
    #[JsonProperty('last_error')]
    public ?string $lastError;

    /**
     * @var array<string, mixed> $payload The event body, exactly as posted to the endpoint.
     */
    #[JsonProperty('payload'), ArrayType(['string' => 'mixed'])]
    public array $payload;

    /**
     * @var array<WebhookAttempt> $attempts Every HTTP attempt of this delivery, oldest first.
     */
    #[JsonProperty('attempts'), ArrayType([WebhookAttempt::class])]
    public array $attempts;

    /**
     * @var DateTime $createdAt
     */
    #[JsonProperty('created_at'), Date(Date::TYPE_DATETIME)]
    public DateTime $createdAt;

    /**
     * @var DateTime $updatedAt
     */
    #[JsonProperty('updated_at'), Date(Date::TYPE_DATETIME)]
    public DateTime $updatedAt;

    /**
     * @param array{
     *   object: value-of<WebhookDeliveryObject>,
     *   id: string,
     *   endpointId: string,
     *   eventId: string,
     *   eventType: string,
     *   status: value-of<WebhookDeliveryStatus>,
     *   attemptCount: int,
     *   payload: array<string, mixed>,
     *   attempts: array<WebhookAttempt>,
     *   createdAt: DateTime,
     *   updatedAt: DateTime,
     *   nextAttemptAt?: ?DateTime,
     *   lastStatusCode?: ?int,
     *   lastError?: ?string,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->object = $values['object'];
        $this->id = $values['id'];
        $this->endpointId = $values['endpointId'];
        $this->eventId = $values['eventId'];
        $this->eventType = $values['eventType'];
        $this->status = $values['status'];
        $this->attemptCount = $values['attemptCount'];
        $this->nextAttemptAt = $values['nextAttemptAt'] ?? null;
        $this->lastStatusCode = $values['lastStatusCode'] ?? null;
        $this->lastError = $values['lastError'] ?? null;
        $this->payload = $values['payload'];
        $this->attempts = $values['attempts'];
        $this->createdAt = $values['createdAt'];
        $this->updatedAt = $values['updatedAt'];
    }

    /**
     * @return string
     */
    public function __toString(): string
    {
        return $this->toJson();
    }
}
