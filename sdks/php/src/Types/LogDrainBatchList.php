<?php

namespace Coss\Types;

use Coss\Core\Json\JsonSerializableType;
use Coss\Core\Json\JsonProperty;
use Coss\Core\Types\ArrayType;

class LogDrainBatchList extends JsonSerializableType
{
    /**
     * @var value-of<LogDrainBatchListObject> $object
     */
    #[JsonProperty('object')]
    public string $object;

    /**
     * @var array<LogDrainBatch> $data
     */
    #[JsonProperty('data'), ArrayType([LogDrainBatch::class])]
    public array $data;

    /**
     * @var bool $hasMore
     */
    #[JsonProperty('has_more')]
    public bool $hasMore;

    /**
     * @param array{
     *   object: value-of<LogDrainBatchListObject>,
     *   data: array<LogDrainBatch>,
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
