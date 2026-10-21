<?php

namespace Coss\Email\Templates\Requests;

use Coss\Core\Json\JsonSerializableType;
use Coss\Core\Json\JsonProperty;

class UpdateEmailTemplateRequest extends JsonSerializableType
{
    /**
     * @var ?string $name
     */
    #[JsonProperty('name')]
    public ?string $name;

    /**
     * @var ?string $alias `null` removes the alias.
     */
    #[JsonProperty('alias')]
    public ?string $alias;

    /**
     * @var ?string $description
     */
    #[JsonProperty('description')]
    public ?string $description;

    /**
     * @param array{
     *   name?: ?string,
     *   alias?: ?string,
     *   description?: ?string,
     * } $values
     */
    public function __construct(
        array $values = [],
    ) {
        $this->name = $values['name'] ?? null;
        $this->alias = $values['alias'] ?? null;
        $this->description = $values['description'] ?? null;
    }
}
