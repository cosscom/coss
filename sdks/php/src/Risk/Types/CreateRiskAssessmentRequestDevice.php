<?php

namespace Coss\Risk\Types;

use Coss\Core\Json\JsonSerializableType;
use Coss\Core\Json\JsonProperty;

/**
 * The browser the event came from: recognizes it across accounts (`duplicate.device`, device velocity, fraud memory) and spots automation.
 */
class CreateRiskAssessmentRequestDevice extends JsonSerializableType
{
    /**
     * @var string $token What `collectDevice()` from `coss/device` returned in the user's browser, passed through your server.
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
