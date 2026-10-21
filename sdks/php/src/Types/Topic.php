<?php

namespace Coss\Types;

use Coss\Core\Json\JsonSerializableType;
use Coss\Core\Json\JsonProperty;
use DateTime;
use Coss\Core\Types\Date;

class Topic extends JsonSerializableType
{
    /**
     * @var value-of<TopicObject> $object
     */
    #[JsonProperty('object')]
    public string $object;

    /**
     * @var string $id
     */
    #[JsonProperty('id')]
    public string $id;

    /**
     * @var string $key The `category` of the emails about this topic. Can't change.
     */
    #[JsonProperty('key')]
    public string $key;

    /**
     * @var string $name
     */
    #[JsonProperty('name')]
    public string $name;

    /**
     * @var ?string $description
     */
    #[JsonProperty('description')]
    public ?string $description;

    /**
     * @var value-of<TopicDefaultSubscription> $defaultSubscription
     */
    #[JsonProperty('default_subscription')]
    public string $defaultSubscription;

    /**
     * @var value-of<TopicVisibility> $visibility
     */
    #[JsonProperty('visibility')]
    public string $visibility;

    /**
     * @var int $position
     */
    #[JsonProperty('position')]
    public int $position;

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
     *   object: value-of<TopicObject>,
     *   id: string,
     *   key: string,
     *   name: string,
     *   defaultSubscription: value-of<TopicDefaultSubscription>,
     *   visibility: value-of<TopicVisibility>,
     *   position: int,
     *   createdAt: DateTime,
     *   updatedAt: DateTime,
     *   description?: ?string,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->object = $values['object'];
        $this->id = $values['id'];
        $this->key = $values['key'];
        $this->name = $values['name'];
        $this->description = $values['description'] ?? null;
        $this->defaultSubscription = $values['defaultSubscription'];
        $this->visibility = $values['visibility'];
        $this->position = $values['position'];
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
