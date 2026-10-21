<?php

namespace Coss\Types;

use Coss\Core\Json\JsonSerializableType;
use Coss\Core\Json\JsonProperty;
use Coss\Core\Types\ArrayType;

class HookAttemptList extends JsonSerializableType
{
    /**
     * @var value-of<HookAttemptListObject> $object
     */
    #[JsonProperty('object')]
    public string $object;

    /**
     * @var array<HookAttempt> $data
     */
    #[JsonProperty('data'), ArrayType([HookAttempt::class])]
    public array $data;

    /**
     * @var bool $hasMore
     */
    #[JsonProperty('has_more')]
    public bool $hasMore;

    /**
     * @param array{
     *   object: value-of<HookAttemptListObject>,
     *   data: array<HookAttempt>,
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
