<?php

namespace Coss\Types;

use Coss\Core\Json\JsonSerializableType;
use Coss\Core\Json\JsonProperty;
use DateTime;
use Coss\Core\Types\Date;

/**
 * What coss.com keeps of the API key's environment's emails. Emails keep the setting that applied when they were sent.
 */
class StorageSettings extends JsonSerializableType
{
    /**
     * @var value-of<StorageSettingsObject> $object
     */
    #[JsonProperty('object')]
    public string $object;

    /**
     * @var value-of<StorageSettingsContentStorage> $contentStorage `store` (the default) keeps each email's content (subject, body, headers, template variables, attachment filenames) for the email retention period. `discard` keeps it only until the email is sent, fails or is canceled; its metadata (addresses, tags, category, status, recipients, events) is kept as usual.
     */
    #[JsonProperty('content_storage')]
    public string $contentStorage;

    /**
     * @var ?DateTime $updatedAt When the setting last changed; `null` if it never did (content is stored).
     */
    #[JsonProperty('updated_at'), Date(Date::TYPE_DATETIME)]
    public ?DateTime $updatedAt;

    /**
     * @param array{
     *   object: value-of<StorageSettingsObject>,
     *   contentStorage: value-of<StorageSettingsContentStorage>,
     *   updatedAt?: ?DateTime,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->object = $values['object'];
        $this->contentStorage = $values['contentStorage'];
        $this->updatedAt = $values['updatedAt'] ?? null;
    }

    /**
     * @return string
     */
    public function __toString(): string
    {
        return $this->toJson();
    }
}
