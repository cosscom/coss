<?php

namespace Coss\Types;

use Coss\Core\Json\JsonSerializableType;
use Coss\Core\Json\JsonProperty;
use DateTime;
use Coss\Core\Types\Date;

/**
 * An environment's tracking default (`category: null`) or the rule for one category. Emails are fixed to the settings that applied when they were sent.
 */
class TrackingRule extends JsonSerializableType
{
    /**
     * @var value-of<TrackingRuleObject> $object
     */
    #[JsonProperty('object')]
    public string $object;

    /**
     * @var string $id
     */
    #[JsonProperty('id')]
    public string $id;

    /**
     * @var ?string $category The category the rule applies to; `null` for the environment default.
     */
    #[JsonProperty('category')]
    public ?string $category;

    /**
     * @var bool $opens Whether opens are tracked.
     */
    #[JsonProperty('opens')]
    public bool $opens;

    /**
     * @var bool $clicks Whether clicks are tracked.
     */
    #[JsonProperty('clicks')]
    public bool $clicks;

    /**
     * @var bool $unsubscribe Whether emails get one-click unsubscribe headers (only emails with a category and a single recipient).
     */
    #[JsonProperty('unsubscribe')]
    public bool $unsubscribe;

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
     *   object: value-of<TrackingRuleObject>,
     *   id: string,
     *   opens: bool,
     *   clicks: bool,
     *   unsubscribe: bool,
     *   createdAt: DateTime,
     *   updatedAt: DateTime,
     *   category?: ?string,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->object = $values['object'];
        $this->id = $values['id'];
        $this->category = $values['category'] ?? null;
        if (array_key_exists('category', $values)) {
            $this->_setField('category');
        }
        $this->opens = $values['opens'];
        $this->clicks = $values['clicks'];
        $this->unsubscribe = $values['unsubscribe'];
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
