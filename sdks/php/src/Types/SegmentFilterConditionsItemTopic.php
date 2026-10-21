<?php

namespace Coss\Types;

use Coss\Core\Json\JsonSerializableType;
use Coss\Core\Json\JsonProperty;

class SegmentFilterConditionsItemTopic extends JsonSerializableType
{
    /**
     * @var value-of<SegmentFilterConditionsItemTopicField> $field
     */
    #[JsonProperty('field')]
    public string $field;

    /**
     * @var value-of<SegmentFilterConditionsItemTopicOp> $op
     */
    #[JsonProperty('op')]
    public string $op;

    /**
     * @var string $topic
     */
    #[JsonProperty('topic')]
    public string $topic;

    /**
     * @param array{
     *   field: value-of<SegmentFilterConditionsItemTopicField>,
     *   op: value-of<SegmentFilterConditionsItemTopicOp>,
     *   topic: string,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->field = $values['field'];
        $this->op = $values['op'];
        $this->topic = $values['topic'];
    }

    /**
     * @return string
     */
    public function __toString(): string
    {
        return $this->toJson();
    }
}
