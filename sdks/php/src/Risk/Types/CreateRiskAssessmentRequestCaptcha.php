<?php

namespace Coss\Risk\Types;

use Coss\Core\Json\JsonSerializableType;
use Coss\Core\Json\JsonProperty;

class CreateRiskAssessmentRequestCaptcha extends JsonSerializableType
{
    /**
     * @var string $token The token your captcha widget (Turnstile or hCaptcha, set in the environment's risk settings) gave the browser. Verified once: don't reuse it.
     */
    #[JsonProperty('token')]
    public string $token;

    /**
     * @param array{
     *   token: string,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->token = $values['token'];
    }

    /**
     * @return string
     */
    public function __toString(): string
    {
        return $this->toJson();
    }
}
