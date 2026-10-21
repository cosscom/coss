<?php

namespace Coss\Email\Audiences\Types;

use Coss\Core\Json\JsonSerializableType;
use Coss\Core\Json\JsonProperty;

class RemoveContactAudiencesResponse extends JsonSerializableType
{
    /**
     * @var value-of<RemoveContactAudiencesResponseObject> $object
     */
    #[JsonProperty('object')]
    public string $object;

    /**
     * @var string $audienceId
     */
    #[JsonProperty('audience_id')]
    public string $audienceId;

    /**
     * @var string $contactId
     */
    #[JsonProperty('contact_id')]
    public string $contactId;

    /**
     * @var bool $deleted
     */
    #[JsonProperty('deleted')]
    public bool $deleted;

    /**
     * @param array{
     *   object: value-of<RemoveContactAudiencesResponseObject>,
     *   audienceId: string,
     *   contactId: string,
     *   deleted: bool,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->object = $values['object'];
        $this->audienceId = $values['audienceId'];
        $this->contactId = $values['contactId'];
        $this->deleted = $values['deleted'];
    }

    /**
     * @return string
     */
    public function __toString(): string
    {
        return $this->toJson();
    }
}
