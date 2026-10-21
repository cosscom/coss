<?php

namespace Coss\Hooks\EventTypes\Requests;

use Coss\Core\Json\JsonSerializableType;
use Coss\Core\Json\JsonProperty;
use Coss\Core\Types\ArrayType;

class UpdateHookEventTypeRequest extends JsonSerializableType
{
    /**
     * @var ?string $description
     */
    #[JsonProperty('description')]
    public ?string $description;

    /**
     * @var ?array<string, mixed> $schema A JSON Schema of the payload, shown to your users (not enforced).
     */
    #[JsonProperty('schema'), ArrayType(['string' => 'mixed'])]
    public ?array $schema;

    /**
     * @var ?array<array<string, mixed>> $examples Up to 5 example payloads; the first is what a test send delivers.
     */
    #[JsonProperty('examples'), ArrayType([['string' => 'mixed']])]
    public ?array $examples;

    /**
     * @var ?bool $archived `false` restores an archived type.
     */
    #[JsonProperty('archived')]
    public ?bool $archived;

    /**
     * @param array{
     *   description?: ?string,
     *   schema?: ?array<string, mixed>,
     *   examples?: ?array<array<string, mixed>>,
     *   archived?: ?bool,
     * } $values
     */
    public function __construct(
        array $values = [],
    ) {
        $this->description = $values['description'] ?? null;
        $this->schema = $values['schema'] ?? null;
        $this->examples = $values['examples'] ?? null;
        $this->archived = $values['archived'] ?? null;
    }
}
