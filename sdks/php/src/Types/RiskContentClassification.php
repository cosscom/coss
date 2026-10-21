<?php

namespace Coss\Types;

use Coss\Core\Json\JsonSerializableType;
use Coss\Core\Json\JsonProperty;

/**
 * Scores only: coss.com never decides what they mean for you. Neither the text nor the scores are stored.
 */
class RiskContentClassification extends JsonSerializableType
{
    /**
     * @var value-of<RiskContentClassificationObject> $object
     */
    #[JsonProperty('object')]
    public string $object;

    /**
     * @var RiskContentSignals $scores
     */
    #[JsonProperty('scores')]
    public RiskContentSignals $scores;

    /**
     * @var bool $truncated The text was longer than the model reads: only its beginning was classified.
     */
    #[JsonProperty('truncated')]
    public bool $truncated;

    /**
     * @param array{
     *   object: value-of<RiskContentClassificationObject>,
     *   scores: RiskContentSignals,
     *   truncated: bool,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->object = $values['object'];
        $this->scores = $values['scores'];
        $this->truncated = $values['truncated'];
    }

    /**
     * @return string
     */
    public function __toString(): string
    {
        return $this->toJson();
    }
}
