<?php

namespace Coss\Types;

use Coss\Core\Json\JsonSerializableType;
use Coss\Core\Json\JsonProperty;

class ReputationCheck extends JsonSerializableType
{
    /**
     * @var string $trigger What was measured, e.g. `bounce_rate` or `complaint_rate`.
     */
    #[JsonProperty('trigger')]
    public string $trigger;

    /**
     * @var value-of<ReputationCheckSeverity> $severity `ok`, `warning` (at or above the warning threshold) or `suspend` (at or above the suspension threshold).
     */
    #[JsonProperty('severity')]
    public string $severity;

    /**
     * @var string $message
     */
    #[JsonProperty('message')]
    public string $message;

    /**
     * @var ?float $rate `count / volume`; `null` with no volume.
     */
    #[JsonProperty('rate')]
    public ?float $rate;

    /**
     * @var int $count Matching recipients, e.g. permanent bounces.
     */
    #[JsonProperty('count')]
    public int $count;

    /**
     * @var int $volume Recipients sent to (live environments) in the window.
     */
    #[JsonProperty('volume')]
    public int $volume;

    /**
     * @var ?float $warningThreshold
     */
    #[JsonProperty('warning_threshold')]
    public ?float $warningThreshold;

    /**
     * @var ?float $suspendThreshold
     */
    #[JsonProperty('suspend_threshold')]
    public ?float $suspendThreshold;

    /**
     * @var ?int $minimumVolume Below this volume the rate is reported but never acted on.
     */
    #[JsonProperty('minimum_volume')]
    public ?int $minimumVolume;

    /**
     * @param array{
     *   trigger: string,
     *   severity: value-of<ReputationCheckSeverity>,
     *   message: string,
     *   count: int,
     *   volume: int,
     *   rate?: ?float,
     *   warningThreshold?: ?float,
     *   suspendThreshold?: ?float,
     *   minimumVolume?: ?int,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->trigger = $values['trigger'];
        $this->severity = $values['severity'];
        $this->message = $values['message'];
        $this->rate = $values['rate'] ?? null;
        if (array_key_exists('rate', $values)) {
            $this->_setField('rate');
        }
        $this->count = $values['count'];
        $this->volume = $values['volume'];
        $this->warningThreshold = $values['warningThreshold'] ?? null;
        if (array_key_exists('warningThreshold', $values)) {
            $this->_setField('warningThreshold');
        }
        $this->suspendThreshold = $values['suspendThreshold'] ?? null;
        if (array_key_exists('suspendThreshold', $values)) {
            $this->_setField('suspendThreshold');
        }
        $this->minimumVolume = $values['minimumVolume'] ?? null;
        if (array_key_exists('minimumVolume', $values)) {
            $this->_setField('minimumVolume');
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
