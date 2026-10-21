<?php

namespace Coss\Risk\Settings\Types;

use Coss\Core\Json\JsonSerializableType;
use Coss\Core\Json\JsonProperty;

/**
 * Changes the categories given: a score in (0, 1] sets the threshold, `null` removes it.
 */
class UpdateRiskSettingsRequestContentThresholds extends JsonSerializableType
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
