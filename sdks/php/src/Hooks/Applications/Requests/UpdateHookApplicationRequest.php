<?php

namespace Coss\Hooks\Applications\Requests;

use Coss\Core\Json\JsonSerializableType;
use Coss\Core\Json\JsonProperty;
use Coss\Core\Types\ArrayType;

class UpdateHookApplicationRequest extends JsonSerializableType
{
    /**
     * @var ?string $name
     */
    #[JsonProperty('name')]
    public ?string $name;

    /**
     * @var ?string $uid `null` removes it.
     */
    #[JsonProperty('uid')]
    public ?string $uid;

    /**
     * @var ?array<string, string> $metadata Replaces the metadata.
     */
    #[JsonProperty('metadata'), ArrayType(['string' => 'string'])]
    public ?array $metadata;

    /**
     * @param array{
     *   name?: ?string,
     *   uid?: ?string,
     *   metadata?: ?array<string, string>,
     * } $values
     */
    public function __construct(
        array $values = [],
    ) {
        $this->name = $values['name'] ?? null;
        $this->uid = $values['uid'] ?? null;
        $this->metadata = $values['metadata'] ?? null;
    }
}
