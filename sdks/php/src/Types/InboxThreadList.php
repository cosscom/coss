<?php

namespace Coss\Types;

use Coss\Core\Json\JsonSerializableType;
use Coss\Core\Json\JsonProperty;
use Coss\Core\Types\ArrayType;

class InboxThreadList extends JsonSerializableType
{
    /**
     * @var value-of<InboxThreadListObject> $object
     */
    #[JsonProperty('object')]
    public string $object;

    /**
     * @var array<InboxThreadSummary> $data
     */
    #[JsonProperty('data'), ArrayType([InboxThreadSummary::class])]
    public array $data;

    /**
     * @var bool $hasMore
     */
    #[JsonProperty('has_more')]
    public bool $hasMore;

    /**
     * @param array{
     *   object: value-of<InboxThreadListObject>,
     *   data: array<InboxThreadSummary>,
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
