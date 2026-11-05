<?php

namespace Coss\Types;

use Coss\Core\Json\JsonSerializableType;
use Coss\Core\Json\JsonProperty;
use DateTime;
use Coss\Core\Types\Date;

class SchedulingOutOfOfficeWebhookEvent extends JsonSerializableType
{
    /**
     * @var string $id The event id.
     */
    #[JsonProperty('id')]
    public string $id;

    /**
     * @var value-of<SchedulingOutOfOfficeWebhookEventObject> $object
     */
    #[JsonProperty('object')]
    public string $object;

    /**
     * @var string $apiVersion The API version this payload is rendered in: the endpoint's.
     */
    #[JsonProperty('api_version')]
    public string $apiVersion;

    /**
     * @var DateTime $createdAt When the event was created.
     */
    #[JsonProperty('created_at'), Date(Date::TYPE_DATETIME)]
    public DateTime $createdAt;

    /**
     * @var value-of<SchedulingOutOfOfficeWebhookEventType> $type
     */
    #[JsonProperty('type')]
    public string $type;

    /**
     * @var SchedulingOutOfOfficeWebhookEventData $data
     */
    #[JsonProperty('data')]
    public SchedulingOutOfOfficeWebhookEventData $data;

    /**
     * @param array{
     *   id: string,
     *   object: value-of<SchedulingOutOfOfficeWebhookEventObject>,
     *   apiVersion: string,
     *   createdAt: DateTime,
     *   type: value-of<SchedulingOutOfOfficeWebhookEventType>,
     *   data: SchedulingOutOfOfficeWebhookEventData,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->id = $values['id'];
        $this->object = $values['object'];
        $this->apiVersion = $values['apiVersion'];
        $this->createdAt = $values['createdAt'];
        $this->type = $values['type'];
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
