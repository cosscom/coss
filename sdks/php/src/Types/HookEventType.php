<?php

namespace Coss\Types;

use Coss\Core\Json\JsonSerializableType;
use Coss\Core\Json\JsonProperty;
use Coss\Core\Types\ArrayType;
use DateTime;
use Coss\Core\Types\Date;

class HookEventType extends JsonSerializableType
{
    /**
     * @var value-of<HookEventTypeObject> $object
     */
    #[JsonProperty('object')]
    public string $object;

    /**
     * @var string $name
     */
    #[JsonProperty('name')]
    public string $name;

    /**
     * @var ?string $description
     */
    #[JsonProperty('description')]
    public ?string $description;

    /**
     * @var ?array<string, mixed> $schema
     */
    #[JsonProperty('schema'), ArrayType(['string' => 'mixed'])]
    public ?array $schema;

    /**
     * @var array<array<string, mixed>> $examples
     */
    #[JsonProperty('examples'), ArrayType([['string' => 'mixed']])]
    public array $examples;

    /**
     * @var bool $archived Archived types are hidden from the portal and can't be subscribed to; messages of the type are still delivered to endpoints that subscribed before.
     */
    #[JsonProperty('archived')]
    public bool $archived;

    /**
     * @var DateTime $createdAt
     */
    #[JsonProperty('created_at'), Date(Date::TYPE_DATETIME)]
    public DateTime $createdAt;

    /**
     * @var DateTime $updatedAt
     */
    #[JsonProperty('updated_at'), Date(Date::TYPE_DATETIME)]
    public DateTime $updatedAt;

    /**
     * @param array{
     *   object: value-of<HookEventTypeObject>,
     *   name: string,
     *   examples: array<array<string, mixed>>,
     *   archived: bool,
     *   createdAt: DateTime,
     *   updatedAt: DateTime,
     *   description?: ?string,
     *   schema?: ?array<string, mixed>,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->object = $values['object'];
        $this->name = $values['name'];
        $this->description = $values['description'] ?? null;
        $this->schema = $values['schema'] ?? null;
        $this->examples = $values['examples'];
        $this->archived = $values['archived'];
        $this->createdAt = $values['createdAt'];
        $this->updatedAt = $values['updatedAt'];
    }

    /**
     * @return string
     */
    public function __toString(): string
    {
        return $this->toJson();
    }
}
