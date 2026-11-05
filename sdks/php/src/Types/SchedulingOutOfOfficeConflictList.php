<?php

namespace Coss\Types;

use Coss\Core\Json\JsonSerializableType;
use Coss\Core\Json\JsonProperty;
use Coss\Core\Types\ArrayType;

class SchedulingOutOfOfficeConflictList extends JsonSerializableType
{
    /**
     * @var value-of<SchedulingOutOfOfficeConflictListObject> $object
     */
    #[JsonProperty('object')]
    public string $object;

    /**
     * @var array<SchedulingOutOfOfficeConflict> $data
     */
    #[JsonProperty('data'), ArrayType([SchedulingOutOfOfficeConflict::class])]
    public array $data;

    /**
     * @var bool $hasMore
     */
    #[JsonProperty('has_more')]
    public bool $hasMore;

    /**
     * @param array{
     *   object: value-of<SchedulingOutOfOfficeConflictListObject>,
     *   data: array<SchedulingOutOfOfficeConflict>,
     *   hasMore: bool,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->object = $values['object'];
        $this->data = $values['data'];
        $this->hasMore = $values['hasMore'];
    }

    /**
     * @return string
     */
    public function __toString(): string
    {
        return $this->toJson();
    }
}
