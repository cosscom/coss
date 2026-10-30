<?php

namespace Coss\Types;

use Coss\Core\Json\JsonSerializableType;
use Coss\Core\Json\JsonProperty;

/**
 * A fraud guard reason (see the docs' list).
 */
class VerificationWebhookEventDataReasonsItem extends JsonSerializableType
{
    /**
     * @var string $code
     */
    #[JsonProperty('code')]
    public string $code;

    /**
     * @var ?float $value
     */
    #[JsonProperty('value')]
    public ?float $value;

    /**
     * @param array{
     *   code: string,
     *   value?: ?float,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->code = $values['code'];
        $this->value = $values['value'] ?? null;
        if (array_key_exists('value', $values)) {
            $this->_setField('value');
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
