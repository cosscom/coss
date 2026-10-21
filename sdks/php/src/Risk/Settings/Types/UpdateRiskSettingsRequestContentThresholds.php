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
        if (array_key_exists('spam', $values)) {
            $this->_setField('spam');
        }
        $this->phishing = $values['phishing'] ?? null;
        if (array_key_exists('phishing', $values)) {
            $this->_setField('phishing');
        }
        $this->malware = $values['malware'] ?? null;
        if (array_key_exists('malware', $values)) {
            $this->_setField('malware');
        }
        $this->fraud = $values['fraud'] ?? null;
        if (array_key_exists('fraud', $values)) {
            $this->_setField('fraud');
        }
    }

    /**
     * @return string
     */
    public function __toString(): string
    {
        return $this->toJson();
    }
}
