<?php

namespace Coss\Types;

use Coss\Core\Json\JsonSerializableType;
use Coss\Core\Json\JsonProperty;

class RiskCalibrationReason extends JsonSerializableType
{
    /**
     * @var value-of<RiskCalibrationReasonCode> $code
     */
    #[JsonProperty('code')]
    public string $code;

    /**
     * @var int $fired Assessments it fired in.
     */
    #[JsonProperty('fired')]
    public int $fired;

    /**
     * @var int $fraud With feedback `fraud` or `abuse`.
     */
    #[JsonProperty('fraud')]
    public int $fraud;

    /**
     * @var int $legitimate With feedback `legitimate`.
     */
    #[JsonProperty('legitimate')]
    public int $legitimate;

    /**
     * @var ?float $precision `fraud / (fraud + legitimate)`: how often it was right when you told coss.com. `null` without feedback.
     */
    #[JsonProperty('precision')]
    public ?float $precision;

    /**
     * @var float $defaultWeight
     */
    #[JsonProperty('default_weight')]
    public float $defaultWeight;

    /**
     * @var float $weight Its weight in this environment now.
     */
    #[JsonProperty('weight')]
    public float $weight;

    /**
     * @var ?float $suggestedWeight The weight feedback supports: its precision, pulled toward the default while there is little feedback. `null` below 20 assessments with feedback.
     */
    #[JsonProperty('suggested_weight')]
    public ?float $suggestedWeight;

    /**
     * @param array{
     *   code: value-of<RiskCalibrationReasonCode>,
     *   fired: int,
     *   fraud: int,
     *   legitimate: int,
     *   defaultWeight: float,
     *   weight: float,
     *   precision?: ?float,
     *   suggestedWeight?: ?float,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->code = $values['code'];
        $this->fired = $values['fired'];
        $this->fraud = $values['fraud'];
        $this->legitimate = $values['legitimate'];
        $this->precision = $values['precision'] ?? null;
        $this->defaultWeight = $values['defaultWeight'];
        $this->weight = $values['weight'];
        $this->suggestedWeight = $values['suggestedWeight'] ?? null;
    }

    /**
     * @return string
     */
    public function __toString(): string
    {
        return $this->toJson();
    }
}
