<?php

namespace Coss\Types;

use Coss\Core\Json\JsonSerializableType;
use Coss\Core\Json\JsonProperty;
use Coss\Core\Types\ArrayType;

class RiskAssessmentList extends JsonSerializableType
{
    /**
     * @var value-of<RiskAssessmentListObject> $object
     */
    #[JsonProperty('object')]
    public string $object;

    /**
     * @var array<RiskAssessment> $data
     */
    #[JsonProperty('data'), ArrayType([RiskAssessment::class])]
    public array $data;

    /**
     * @var bool $hasMore
     */
    #[JsonProperty('has_more')]
    public bool $hasMore;

    /**
     * @param array{
     *   object: value-of<RiskAssessmentListObject>,
     *   data: array<RiskAssessment>,
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
