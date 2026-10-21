<?php

namespace Coss\Hooks\Messages\Requests;

use Coss\Core\Json\JsonSerializableType;

class ListMessagesRequest extends JsonSerializableType
{
    /**
     * @var ?string $eventType Only messages of this type.
     */
    public ?string $eventType;

    /**
     * @var ?int $limit 1-100, default 50.
     */
    public ?int $limit;

    /**
     * @var ?string $after Cursor: the `id` of the last message of the previous page.
     */
    public ?string $after;

    /**
     * @param array{
     *   eventType?: ?string,
     *   limit?: ?int,
     *   after?: ?string,
     * } $values
     */
    public function __construct(
        array $values = [],
    ) {
        $this->eventType = $values['eventType'] ?? null;
        if (array_key_exists('eventType', $values)) {
            $this->_setField('eventType');
        }
        $this->limit = $values['limit'] ?? null;
        if (array_key_exists('limit', $values)) {
            $this->_setField('limit');
        }
        $this->after = $values['after'] ?? null;
        if (array_key_exists('after', $values)) {
            $this->_setField('after');
        }
    }
}
