<?php

namespace Coss\Types;

use Coss\Core\Json\JsonSerializableType;
use Coss\Core\Json\JsonProperty;
use Coss\Core\Types\ArrayType;

class FormContacts extends JsonSerializableType
{
    /**
     * @var bool $enabled
     */
    #[JsonProperty('enabled')]
    public bool $enabled;

    /**
     * @var array<string> $audienceIds
     */
    #[JsonProperty('audience_ids'), ArrayType(['string'])]
    public array $audienceIds;

    /**
     * @var array<string> $topics
     */
    #[JsonProperty('topics'), ArrayType(['string'])]
    public array $topics;

    /**
     * @var ?bool $doubleOptIn
     */
    #[JsonProperty('double_opt_in')]
    public ?bool $doubleOptIn;

    /**
     * @var ?string $firstNameField
     */
    #[JsonProperty('first_name_field')]
    public ?string $firstNameField;

    /**
     * @var ?string $lastNameField
     */
    #[JsonProperty('last_name_field')]
    public ?string $lastNameField;

    /**
     * @var array<string, string> $properties
     */
    #[JsonProperty('properties'), ArrayType(['string' => 'string'])]
    public array $properties;

    /**
     * @param array{
     *   enabled: bool,
     *   audienceIds: array<string>,
     *   topics: array<string>,
     *   properties: array<string, string>,
     *   doubleOptIn?: ?bool,
     *   firstNameField?: ?string,
     *   lastNameField?: ?string,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->enabled = $values['enabled'];
        $this->audienceIds = $values['audienceIds'];
        $this->topics = $values['topics'];
        $this->doubleOptIn = $values['doubleOptIn'] ?? null;
        if (array_key_exists('doubleOptIn', $values)) {
            $this->_setField('doubleOptIn');
        }
        $this->firstNameField = $values['firstNameField'] ?? null;
        if (array_key_exists('firstNameField', $values)) {
            $this->_setField('firstNameField');
        }
        $this->lastNameField = $values['lastNameField'] ?? null;
        if (array_key_exists('lastNameField', $values)) {
            $this->_setField('lastNameField');
        }
        $this->properties = $values['properties'];
    }

    /**
     * @return string
     */
    public function __toString(): string
    {
        return $this->toJson();
    }
}
