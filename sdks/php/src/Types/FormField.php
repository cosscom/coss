<?php

namespace Coss\Types;

use Coss\Core\Json\JsonSerializableType;
use Coss\Core\Json\JsonProperty;
use Coss\Core\Types\ArrayType;

class FormField extends JsonSerializableType
{
    /**
     * @var string $name
     */
    #[JsonProperty('name')]
    public string $name;

    /**
     * @var value-of<FormFieldType> $type
     */
    #[JsonProperty('type')]
    public string $type;

    /**
     * @var ?string $label
     */
    #[JsonProperty('label')]
    public ?string $label;

    /**
     * @var bool $required
     */
    #[JsonProperty('required')]
    public bool $required;

    /**
     * @var ?string $placeholder
     */
    #[JsonProperty('placeholder')]
    public ?string $placeholder;

    /**
     * @var array<string> $options
     */
    #[JsonProperty('options'), ArrayType(['string'])]
    public array $options;

    /**
     * @var ?int $maxLength
     */
    #[JsonProperty('max_length')]
    public ?int $maxLength;

    /**
     * @param array{
     *   name: string,
     *   type: value-of<FormFieldType>,
     *   required: bool,
     *   options: array<string>,
     *   label?: ?string,
     *   placeholder?: ?string,
     *   maxLength?: ?int,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->name = $values['name'];
        $this->type = $values['type'];
        $this->label = $values['label'] ?? null;
        if (array_key_exists('label', $values)) {
            $this->_setField('label');
        }
        $this->required = $values['required'];
        $this->placeholder = $values['placeholder'] ?? null;
        if (array_key_exists('placeholder', $values)) {
            $this->_setField('placeholder');
        }
        $this->options = $values['options'];
        $this->maxLength = $values['maxLength'] ?? null;
        if (array_key_exists('maxLength', $values)) {
            $this->_setField('maxLength');
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
