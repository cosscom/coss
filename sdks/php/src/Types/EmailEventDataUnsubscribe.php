<?php

namespace Coss\Types;

use Coss\Core\Json\JsonSerializableType;
use Coss\Core\Json\JsonProperty;

/**
 * Only for `email.suppressed` without `suppression`: the recipient is a contact who unsubscribed (from marketing, or from the email's topic, `topic`).
 */
class EmailEventDataUnsubscribe extends JsonSerializableType
{
    /**
     * @var ?string $contactId
     */
    #[JsonProperty('contact_id')]
    public ?string $contactId;

    /**
     * @var ?string $topic
     */
    #[JsonProperty('topic')]
    public ?string $topic;

    /**
     * @param array{
     *   contactId?: ?string,
     *   topic?: ?string,
     * } $values
     */
    public function __construct(
        array $values = [],
    ) {
        $this->contactId = $values['contactId'] ?? null;
        $this->topic = $values['topic'] ?? null;
    }

    /**
     * @return string
     */
    public function __toString(): string
    {
        return $this->toJson();
    }
}
