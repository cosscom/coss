<?php

namespace Coss\Email\Storage\Requests;

use Coss\Core\Json\JsonSerializableType;
use Coss\Email\Storage\Types\UpdateStorageSettingsRequestContentStorage;
use Coss\Core\Json\JsonProperty;

class UpdateStorageSettingsRequest extends JsonSerializableType
{
    /**
     * @var value-of<UpdateStorageSettingsRequestContentStorage> $contentStorage `store` keeps emails' content; `discard` clears it once they are sent.
     */
    #[JsonProperty('content_storage')]
    public string $contentStorage;

    /**
     * @param array{
     *   contentStorage: value-of<UpdateStorageSettingsRequestContentStorage>,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->contentStorage = $values['contentStorage'];
    }
}
