<?php

namespace Coss\Types;

use Coss\Core\Json\JsonSerializableType;
use Coss\Core\Json\JsonProperty;

/**
 * Per content category, the score at which `content.<category>` fires; `null`: never (the score is still in `signals.content` for your rules).
 */
class RiskSettingsContentThresholds extends JsonSerializableType
{
    /**
     * @var ?float $spam
     */
    #[JsonProperty('spam')]
    public ?float $spam;

    /**
     * @var ?float $phishing
     */
    #[JsonProperty('phishing')]
    public ?float $phishing;

    /**
     * @var ?float $malware
     */
    #[JsonProperty('malware')]
    public ?float $malware;

    /**
     * @var ?float $fraud
     */
    #[JsonProperty('fraud')]
    public ?float $fraud;

    /**
     * @param array{
     *   spam?: ?float,
     *   phishing?: ?float,
     *   malware?: ?float,
     *   fraud?: ?float,
     * } $values
     */
    public function __construct(
        array $values = [],
    ) {
        $this->spam = $values['spam'] ?? null;
        $this->phishing = $values['phishing'] ?? null;
        $this->malware = $values['malware'] ?? null;
        $this->fraud = $values['fraud'] ?? null;
    }

    /**
     * @return string
     */
    public function __toString(): string
    {
        return $this->toJson();
    }
}
