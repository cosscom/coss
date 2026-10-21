<?php

namespace Coss\Types;

use Coss\Core\Json\JsonSerializableType;
use Coss\Core\Json\JsonProperty;

/**
 * The API key making this request.
 */
class EnvironmentApiKey extends JsonSerializableType
{
    /**
     * @var string $id The key's id.
     */
    #[JsonProperty('id')]
    public string $id;

    /**
     * @var ?string $name
     */
    #[JsonProperty('name')]
    public ?string $name;

    /**
     * @var ?string $start The key's first characters, as shown in the dashboard.
     */
    #[JsonProperty('start')]
    public ?string $start;

    /**
     * @param array{
     *   id: string,
     *   name?: ?string,
     *   start?: ?string,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->id = $values['id'];
        $this->name = $values['name'] ?? null;
        $this->start = $values['start'] ?? null;
    }

    /**
     * @return string
     */
    public function __toString(): string
    {
        return $this->toJson();
    }
}
