<?php

namespace Coss\Types;

use Coss\Core\Json\JsonSerializableType;
use Coss\Core\Json\JsonProperty;
use DateTime;
use Coss\Core\Types\Date;

class InboxMessageReceivedWebhookEvent extends JsonSerializableType
{
    /**
     * @var string $id The event id, and the `webhook-id` header.
     */
    #[JsonProperty('id')]
    public string $id;

    /**
     * @var value-of<InboxMessageReceivedWebhookEventObject> $object
     */
    #[JsonProperty('object')]
    public string $object;

    /**
     * @var value-of<InboxMessageReceivedWebhookEventType> $type
     */
    #[JsonProperty('type')]
    public string $type;

    /**
     * @var string $apiVersion The API version (`Coss-Version`) this event is rendered in: the receiving endpoint's `api_version`.
     */
    #[JsonProperty('api_version')]
    public string $apiVersion;

    /**
     * @var DateTime $createdAt
     */
    #[JsonProperty('created_at'), Date(Date::TYPE_DATETIME)]
    public DateTime $createdAt;

    /**
     * @var InboxMessageReceivedWebhookEventData $data
     */
    #[JsonProperty('data')]
    public InboxMessageReceivedWebhookEventData $data;

    /**
     * @param array{
     *   id: string,
     *   object: value-of<InboxMessageReceivedWebhookEventObject>,
     *   type: value-of<InboxMessageReceivedWebhookEventType>,
     *   apiVersion: string,
     *   createdAt: DateTime,
     *   data: InboxMessageReceivedWebhookEventData,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->id = $values['id'];
        $this->object = $values['object'];
        $this->type = $values['type'];
        $this->apiVersion = $values['apiVersion'];
        $this->createdAt = $values['createdAt'];
        $this->data = $values['data'];
    }

    /**
     * @return string
     */
    public function __toString(): string
    {
        return $this->toJson();
    }
}
