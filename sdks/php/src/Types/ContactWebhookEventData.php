<?php

namespace Coss\Types;

use Coss\Core\Json\JsonSerializableType;
use Coss\Core\Json\JsonProperty;
use DateTime;
use Coss\Core\Types\Date;

class ContactWebhookEventData extends JsonSerializableType
{
    /**
     * @var ContactWebhookEventDataContact $contact
     */
    #[JsonProperty('contact')]
    public ContactWebhookEventDataContact $contact;

    /**
     * @var value-of<ContactWebhookEventDataSource> $source
     */
    #[JsonProperty('source')]
    public string $source;

    /**
     * @var ?string $topic `contact.unsubscribed` from one topic (its key); `null`: from marketing altogether.
     */
    #[JsonProperty('topic')]
    public ?string $topic;

    /**
     * @var DateTime $occurredAt
     */
    #[JsonProperty('occurred_at'), Date(Date::TYPE_DATETIME)]
    public DateTime $occurredAt;

    /**
     * @param array{
     *   contact: ContactWebhookEventDataContact,
     *   source: value-of<ContactWebhookEventDataSource>,
     *   occurredAt: DateTime,
     *   topic?: ?string,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->contact = $values['contact'];
        $this->source = $values['source'];
        $this->topic = $values['topic'] ?? null;
        $this->occurredAt = $values['occurredAt'];
    }

    /**
     * @return string
     */
    public function __toString(): string
    {
        return $this->toJson();
    }
}
