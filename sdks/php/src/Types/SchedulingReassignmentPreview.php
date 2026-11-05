<?php

namespace Coss\Types;

use Coss\Core\Json\JsonSerializableType;
use Coss\Core\Json\JsonProperty;
use Coss\Core\Types\ArrayType;

class SchedulingReassignmentPreview extends JsonSerializableType
{
    /**
     * @var value-of<SchedulingReassignmentPreviewObject> $object
     */
    #[JsonProperty('object')]
    public string $object;

    /**
     * @var array<SchedulingReassignmentPreviewItemsItem> $items
     */
    #[JsonProperty('items'), ArrayType([SchedulingReassignmentPreviewItemsItem::class])]
    public array $items;

    /**
     * @var bool $truncated There are more than a preview covers.
     */
    #[JsonProperty('truncated')]
    public bool $truncated;

    /**
     * @param array{
     *   object: value-of<SchedulingReassignmentPreviewObject>,
     *   items: array<SchedulingReassignmentPreviewItemsItem>,
     *   truncated: bool,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->object = $values['object'];
        $this->items = $values['items'];
        $this->truncated = $values['truncated'];
    }

    /**
     * @return string
     */
    public function __toString(): string
    {
        return $this->toJson();
    }
}
