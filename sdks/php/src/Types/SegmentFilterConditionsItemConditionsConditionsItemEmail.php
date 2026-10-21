<?php

namespace Coss\Types;

use Coss\Core\Json\JsonSerializableType;
use Coss\Core\Json\JsonProperty;

class SegmentFilterConditionsItemConditionsConditionsItemEmail extends JsonSerializableType
{
    /**
     * @var value-of<SegmentFilterConditionsItemConditionsConditionsItemEmailOp> $op
     */
    #[JsonProperty('op')]
    public string $op;

    /**
     * @var string $value
     */
    #[JsonProperty('value')]
    public string $value;

    /**
     * @param array{
     *   op: value-of<SegmentFilterConditionsItemConditionsConditionsItemEmailOp>,
     *   value: string,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->op = $values['op'];
        $this->value = $values['value'];
    }

    /**
     * @return string
     */
    public function __toString(): string
    {
        return $this->toJson();
    }
}
