<?php

namespace Coss\Hooks\Applications\Requests;

use Coss\Core\Json\JsonSerializableType;
use Coss\Core\Json\JsonProperty;
use Coss\Core\Types\ArrayType;

class CreateHookApplicationRequest extends JsonSerializableType
{
    /**
     * @var string $name Shown to the application's users in the portal.
     */
    #[JsonProperty('name')]
    public string $name;

    /**
     * @var ?string $uid Your own id for it, to address it by in every path instead of its `id`.
     */
    #[JsonProperty('uid')]
    public ?string $uid;

    /**
     * @var ?array<string, string> $metadata Your own key-value pairs (at most 16; keys up to 40 characters, values up to 500).
     */
    #[JsonProperty('metadata'), ArrayType(['string' => 'string'])]
    public ?array $metadata;

    /**
     * @param array{
     *   name: string,
     *   uid?: ?string,
     *   metadata?: ?array<string, string>,
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
    }
}
