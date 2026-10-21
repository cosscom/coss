<?php

namespace Coss\Types;

use Coss\Core\Json\JsonSerializableType;
use Coss\Core\Json\JsonProperty;
use Coss\Core\Types\ArrayType;

class DomainRecord extends JsonSerializableType
{
    /**
     * @var value-of<DomainRecordPurpose> $purpose What the record is for: `dkim` signs messages, `mail_from_mx` and `mail_from_spf` set up the bounce subdomain, `dmarc` is recommended but not required.
     */
    #[JsonProperty('purpose')]
    public string $purpose;

    /**
     * @var value-of<DomainRecordType> $type
     */
    #[JsonProperty('type')]
    public string $type;

    /**
     * @var string $name The fully qualified record name to create.
     */
    #[JsonProperty('name')]
    public string $name;

    /**
     * @var string $value
     */
    #[JsonProperty('value')]
    public string $value;

    /**
     * @var ?int $priority `MX` records only.
     */
    #[JsonProperty('priority')]
    public ?int $priority;

    /**
     * @var bool $required `false` for records that are only recommended.
     */
    #[JsonProperty('required')]
    public bool $required;

    /**
     * @var value-of<DomainRecordStatus> $status What the last DNS check saw. `not_checked` means DNS has not been consulted yet.
     */
    #[JsonProperty('status')]
    public string $status;

    /**
     * @var array<string> $found What DNS returned when it did not match.
     */
    #[JsonProperty('found'), ArrayType(['string'])]
    public array $found;

    /**
     * @param array{
     *   purpose: value-of<DomainRecordPurpose>,
     *   type: value-of<DomainRecordType>,
     *   name: string,
     *   value: string,
     *   required: bool,
     *   status: value-of<DomainRecordStatus>,
     *   found: array<string>,
     *   priority?: ?int,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->purpose = $values['purpose'];
        $this->type = $values['type'];
        $this->name = $values['name'];
        $this->value = $values['value'];
        $this->priority = $values['priority'] ?? null;
        if (array_key_exists('priority', $values)) {
            $this->_setField('priority');
        }
        $this->required = $values['required'];
        $this->status = $values['status'];
        $this->found = $values['found'];
    }

    /**
     * @return string
     */
    public function __toString(): string
    {
        return $this->toJson();
    }
}
