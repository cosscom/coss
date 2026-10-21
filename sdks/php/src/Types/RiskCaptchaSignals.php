<?php

namespace Coss\Types;

use Coss\Core\Json\JsonSerializableType;
use Coss\Core\Json\JsonProperty;

class RiskCaptchaSignals extends JsonSerializableType
{
    /**
     * @var bool $provided
     */
    #[JsonProperty('provided')]
    public bool $provided;

    /**
     * @var ?bool $passed `null` when it couldn't be checked (no captcha configured, or the provider was unreachable).
     */
    #[JsonProperty('passed')]
    public ?bool $passed;

    /**
     * @param array{
     *   provided: bool,
     *   passed?: ?bool,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->provided = $values['provided'];
        $this->passed = $values['passed'] ?? null;
    }

    /**
     * @return string
     */
    public function __toString(): string
    {
        return $this->toJson();
    }
}
