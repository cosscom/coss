<?php

namespace Coss\Types;

use Coss\Core\Json\JsonSerializableType;
use Coss\Core\Json\JsonProperty;

class SegmentFilterConditionsItemOne extends JsonSerializableType
{
    /**
     * @var value-of<SegmentFilterConditionsItemOneField> $field
     */
    #[JsonProperty('field')]
    public string $field;

    /**
     * @var value-of<SegmentFilterConditionsItemOneOp> $op
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
     *   field: value-of<SegmentFilterConditionsItemOneField>,
     *   op: value-of<SegmentFilterConditionsItemOneOp>,
     *   value: string,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->field = $values['field'];
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
