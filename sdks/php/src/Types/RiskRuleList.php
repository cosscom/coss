<?php

namespace Coss\Types;

use Coss\Core\Json\JsonSerializableType;
use Coss\Core\Json\JsonProperty;
use Coss\Core\Types\ArrayType;

/**
 * Every rule of the environment (at most 50), in evaluation order.
 */
class RiskRuleList extends JsonSerializableType
{
    /**
     * @var value-of<RiskRuleListObject> $object
     */
    #[JsonProperty('object')]
    public string $object;

    /**
     * @var array<RiskRule> $data
     */
    #[JsonProperty('data'), ArrayType([RiskRule::class])]
    public array $data;

    /**
     * @var bool $hasMore
     */
    #[JsonProperty('has_more')]
    public bool $hasMore;

    /**
     * @param array{
     *   object: value-of<RiskRuleListObject>,
     *   data: array<RiskRule>,
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
