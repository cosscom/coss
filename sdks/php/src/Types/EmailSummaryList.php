<?php

namespace Coss\Types;

use Coss\Core\Json\JsonSerializableType;
use Coss\Core\Json\JsonProperty;
use Coss\Core\Types\ArrayType;

class EmailSummaryList extends JsonSerializableType
{
    /**
     * @var value-of<EmailSummaryListObject> $object
     */
    #[JsonProperty('object')]
    public string $object;

    /**
     * @var array<EmailSummary> $data
     */
    #[JsonProperty('data'), ArrayType([EmailSummary::class])]
    public array $data;

    /**
     * @var bool $hasMore
     */
    #[JsonProperty('has_more')]
    public bool $hasMore;

    /**
     * @param array{
     *   object: value-of<EmailSummaryListObject>,
     *   data: array<EmailSummary>,
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
