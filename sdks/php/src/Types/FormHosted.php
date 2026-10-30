<?php

namespace Coss\Types;

use Coss\Core\Json\JsonSerializableType;
use Coss\Core\Json\JsonProperty;
use DateTime;
use Coss\Core\Types\Date;

class FormHosted extends JsonSerializableType
{
    /**
     * @var bool $enabled
     */
    #[JsonProperty('enabled')]
    public bool $enabled;

    /**
     * @var ?string $title
     */
    #[JsonProperty('title')]
    public ?string $title;

    /**
     * @var ?string $description
     */
    #[JsonProperty('description')]
    public ?string $description;

    /**
     * @var ?string $submitLabel
     */
    #[JsonProperty('submit_label')]
    public ?string $submitLabel;

    /**
     * @var ?string $successMessage
     */
    #[JsonProperty('success_message')]
    public ?string $successMessage;

    /**
     * @var ?DateTime $publishedAt
     */
    #[JsonProperty('published_at'), Date(Date::TYPE_DATETIME)]
    public ?DateTime $publishedAt;

    /**
     * @param array{
     *   enabled: bool,
     *   title?: ?string,
     *   description?: ?string,
     *   submitLabel?: ?string,
     *   successMessage?: ?string,
     *   publishedAt?: ?DateTime,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->enabled = $values['enabled'];
        $this->title = $values['title'] ?? null;
        if (array_key_exists('title', $values)) {
            $this->_setField('title');
        }
        $this->description = $values['description'] ?? null;
        if (array_key_exists('description', $values)) {
            $this->_setField('description');
        }
        $this->submitLabel = $values['submitLabel'] ?? null;
        if (array_key_exists('submitLabel', $values)) {
            $this->_setField('submitLabel');
        }
        $this->successMessage = $values['successMessage'] ?? null;
        if (array_key_exists('successMessage', $values)) {
            $this->_setField('successMessage');
        }
        $this->publishedAt = $values['publishedAt'] ?? null;
        if (array_key_exists('publishedAt', $values)) {
            $this->_setField('publishedAt');
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
