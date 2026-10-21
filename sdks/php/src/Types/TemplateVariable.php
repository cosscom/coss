<?php

namespace Coss\Types;

use Coss\Core\Json\JsonSerializableType;
use Coss\Core\Json\JsonProperty;
use Coss\Core\Types\Union;
use Coss\Core\Types\ArrayType;

class TemplateVariable extends JsonSerializableType
{
    /**
     * @var string $name
     */
    #[JsonProperty('name')]
    public string $name;

    /**
     * @var value-of<TemplateVariableType> $type
     */
    #[JsonProperty('type')]
    public string $type;

    /**
     * @var bool $required
     */
    #[JsonProperty('required')]
    public bool $required;

    /**
     * @var (
     *    string
     *   |float
     *   |bool
     * )|null $default
     */
    #[JsonProperty('default'), Union('string', 'float', 'bool', 'null')]
    public string|float|bool|null $default;

    /**
     * @var ?string $description
     */
    #[JsonProperty('description')]
    public ?string $description;

    /**
     * @var ?array<TemplateVariableFieldsItem> $fields
     */
    #[JsonProperty('fields'), ArrayType([TemplateVariableFieldsItem::class])]
    public ?array $fields;

    /**
     * @param array{
     *   name: string,
     *   type: value-of<TemplateVariableType>,
     *   required: bool,
     *   default?: (
     *    string
     *   |float
     *   |bool
     * )|null,
     *   description?: ?string,
     *   fields?: ?array<TemplateVariableFieldsItem>,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->name = $values['name'];
        $this->type = $values['type'];
        $this->required = $values['required'];
        $this->default = $values['default'] ?? null;
        if (array_key_exists('default', $values)) {
            $this->_setField('default');
        }
        $this->description = $values['description'] ?? null;
        if (array_key_exists('description', $values)) {
            $this->_setField('description');
        }
        $this->fields = $values['fields'] ?? null;
        if (array_key_exists('fields', $values)) {
            $this->_setField('fields');
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
