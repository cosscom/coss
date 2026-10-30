<?php

namespace Coss\Email\Subaccounts\Requests;

use Coss\Core\Json\JsonSerializableType;
use Coss\Core\Json\JsonProperty;
use Coss\Core\Types\ArrayType;
use Coss\Email\Subaccounts\Types\CreateSubaccountRequestQuotas;

class CreateSubaccountRequest extends JsonSerializableType
{
    /**
     * @var string $name A name for your own reference.
     */
    #[JsonProperty('name')]
    public string $name;

    /**
     * @var ?string $uid Your own id for it, to address it by instead of its `id`.
     */
    #[JsonProperty('uid')]
    public ?string $uid;

    /**
     * @var ?array<string, string> $metadata Your own key-value pairs (at most 16; keys up to 40 characters, values up to 500).
     */
    #[JsonProperty('metadata'), ArrayType(['string' => 'string'])]
    public ?array $metadata;

    /**
     * @var ?CreateSubaccountRequestQuotas $quotas Fields left out keep their value; `null` removes a quota.
     */
    #[JsonProperty('quotas')]
    public ?CreateSubaccountRequestQuotas $quotas;

    /**
     * @param array{
     *   name: string,
     *   uid?: ?string,
     *   metadata?: ?array<string, string>,
     *   quotas?: ?CreateSubaccountRequestQuotas,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->name = $values['name'];
        $this->uid = $values['uid'] ?? null;
        if (array_key_exists('uid', $values)) {
            $this->_setField('uid');
        }
        $this->metadata = $values['metadata'] ?? null;
        if (array_key_exists('metadata', $values)) {
            $this->_setField('metadata');
        }
        $this->quotas = $values['quotas'] ?? null;
        if (array_key_exists('quotas', $values)) {
            $this->_setField('quotas');
        }
    }
}
