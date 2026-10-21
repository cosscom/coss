<?php

namespace Coss\Risk\Types;

use Coss\Core\Json\JsonSerializableType;
use Coss\Core\Json\JsonProperty;

/**
 * Content to classify with the event. Its scores go in `signals.content` and rules can test them; `content.*` reasons fire only at thresholds you set.
 */
class CreateRiskAssessmentRequestContent extends JsonSerializableType
{
    /**
     * @var string $text Text the user wrote (a profile bio, a message, a listing). Classified by an AI model with zero data retention and never stored: only its scores are.
     */
    #[JsonProperty('text')]
    public string $text;

    /**
     * @param array{
     *   text: string,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->text = $values['text'];
    }

    /**
     * @return string
     */
    public function __toString(): string
    {
        return $this->toJson();
    }
}
