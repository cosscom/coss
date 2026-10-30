<?php

namespace Coss\Types;

use Coss\Core\Json\JsonSerializableType;
use Coss\Core\Json\JsonProperty;

class FormSubmitter extends JsonSerializableType
{
    /**
     * @var string $emailField
     */
    #[JsonProperty('email_field')]
    public string $emailField;

    /**
     * @var bool $verify
     */
    #[JsonProperty('verify')]
    public bool $verify;

    /**
     * @var ?string $confirmationFrom
     */
    #[JsonProperty('confirmation_from')]
    public ?string $confirmationFrom;

    /**
     * @param array{
     *   emailField: string,
     *   verify: bool,
     *   confirmationFrom?: ?string,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->emailField = $values['emailField'];
        $this->verify = $values['verify'];
        $this->confirmationFrom = $values['confirmationFrom'] ?? null;
        if (array_key_exists('confirmationFrom', $values)) {
            $this->_setField('confirmationFrom');
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
