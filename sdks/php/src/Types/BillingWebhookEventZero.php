<?php

namespace Coss\Types;

use Coss\Core\Json\JsonSerializableType;
use Coss\Core\Json\JsonProperty;
use DateTime;
use Coss\Core\Types\Date;

class BillingWebhookEventZero extends JsonSerializableType
{
    /**
     * @var string $id The event id, also sent as the `webhook-id` header.
     */
    #[JsonProperty('id')]
    public string $id;

    /**
     * @var value-of<BillingWebhookEventZeroObject> $object
     */
    #[JsonProperty('object')]
    public string $object;

    /**
     * @var string $apiVersion The API version this event is rendered in: the receiving endpoint's `api_version`.
     */
    #[JsonProperty('api_version')]
    public string $apiVersion;

    /**
     * @var DateTime $createdAt
     */
    #[JsonProperty('created_at'), Date(Date::TYPE_DATETIME)]
    public DateTime $createdAt;

    /**
     * @var value-of<BillingWebhookEventZeroType> $type
     */
    #[JsonProperty('type')]
    public string $type;

    /**
     * @var BillingWebhookEventZeroData $data
     */
    #[JsonProperty('data')]
    public BillingWebhookEventZeroData $data;

    /**
     * @param array{
     *   id: string,
     *   object: value-of<BillingWebhookEventZeroObject>,
     *   apiVersion: string,
     *   createdAt: DateTime,
     *   type: value-of<BillingWebhookEventZeroType>,
     *   data: BillingWebhookEventZeroData,
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
