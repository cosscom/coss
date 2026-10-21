<?php

namespace Coss\Email\Contacts\Requests;

use Coss\Core\Json\JsonSerializableType;
use Coss\Core\Json\JsonProperty;

class CreatePreferenceLinksRequest extends JsonSerializableType
{
    /**
     * @var ?string $topic The topic your email is about: its unsubscribe link leaves just that topic.
     */
    #[JsonProperty('topic')]
    public ?string $topic;

    /**
     * @param array{
     *   topic?: ?string,
     * } $values
     */
    public function __construct(
        array $values = [],
    ) {
        $this->topic = $values['topic'] ?? null;
    }
}
