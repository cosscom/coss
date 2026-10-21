<?php

namespace Coss\Types;

use Coss\Core\Json\JsonSerializableType;
use Coss\Core\Json\JsonProperty;

class SegmentFilterConditionsItemConditionsConditionsItemAudience extends JsonSerializableType
{
    /**
     * @var value-of<SegmentFilterConditionsItemConditionsConditionsItemAudienceOp> $op
     */
    #[JsonProperty('op')]
    public string $op;

    /**
     * @var string $audienceId
     */
    #[JsonProperty('audience_id')]
    public string $audienceId;

    /**
     * @param array{
     *   op: value-of<SegmentFilterConditionsItemConditionsConditionsItemAudienceOp>,
     *   audienceId: string,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->op = $values['op'];
        $this->audienceId = $values['audienceId'];
    }

    /**
     * @return string
     */
    public function __toString(): string
    {
        return $this->toJson();
    }
}
