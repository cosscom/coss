<?php

namespace Coss\Types;

use Coss\Core\Json\JsonSerializableType;
use Coss\Core\Json\JsonProperty;

/**
 * Per category, the model's probability (0-1) that the content belongs to it. Scores are not calibrated: pick thresholds by looking at your own traffic.
 */
class RiskContentSignals extends JsonSerializableType
{
    /**
     * @var float $spam
     */
    #[JsonProperty('spam')]
    public float $spam;

    /**
     * @var float $phishing
     */
    #[JsonProperty('phishing')]
    public float $phishing;

    /**
     * @var float $malware
     */
    #[JsonProperty('malware')]
    public float $malware;

    /**
     * @var float $fraud
     */
    #[JsonProperty('fraud')]
    public float $fraud;

    /**
     * @param array{
     *   spam: float,
     *   phishing: float,
     *   malware: float,
     *   fraud: float,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->spam = $values['spam'];
        $this->phishing = $values['phishing'];
        $this->malware = $values['malware'];
        $this->fraud = $values['fraud'];
    }

    /**
     * @return string
     */
    public function __toString(): string
    {
        return $this->toJson();
    }
}
