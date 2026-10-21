<?php

namespace Coss\Risk\Requests;

use Coss\Core\Json\JsonSerializableType;
use Coss\Core\Json\JsonProperty;

class RiskContentClassifyRequest extends JsonSerializableType
{
    /**
     * @var string $text The text to classify (a profile bio, a comment, a listing). The model reads the first 8,000 characters.
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
}
