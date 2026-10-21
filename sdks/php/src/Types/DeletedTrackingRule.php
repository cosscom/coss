<?php

namespace Coss\Types;

use Coss\Core\Json\JsonSerializableType;
use Coss\Core\Json\JsonProperty;

class DeletedTrackingRule extends JsonSerializableType
{
    /**
     * @var value-of<DeletedTrackingRuleObject> $object
     */
    #[JsonProperty('object')]
    public string $object;

    /**
     * @var string $id
     */
    #[JsonProperty('id')]
    public string $id;

    /**
     * @var ?string $category
     */
    #[JsonProperty('category')]
    public ?string $category;

    /**
     * @var bool $deleted
     */
    #[JsonProperty('deleted')]
    public bool $deleted;

    /**
     * @param array{
     *   object: value-of<DeletedTrackingRuleObject>,
     *   id: string,
     *   deleted: bool,
     *   category?: ?string,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->object = $values['object'];
        $this->id = $values['id'];
        $this->category = $values['category'] ?? null;
        $this->deleted = $values['deleted'];
    }

    /**
     * @return string
     */
    public function __toString(): string
    {
        return $this->toJson();
    }
}
