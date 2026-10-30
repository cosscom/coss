<?php

namespace Coss\Inboxes\Messages\Requests;

use Coss\Core\Json\JsonSerializableType;
use Coss\Inboxes\Messages\Types\ListMessagesRequestDirection;

class ListMessagesRequest extends JsonSerializableType
{
    /**
     * @var ?int $limit 1-100, default 20.
     */
    public ?int $limit;

    /**
     * @var ?string $after Cursor: the `id` of the last item of the previous page.
     */
    public ?string $after;

    /**
     * @var ?value-of<ListMessagesRequestDirection> $direction Only inbound (received) or outbound (sent) messages.
     */
    public ?string $direction;

    /**
     * @param array{
     *   limit?: ?int,
     *   after?: ?string,
     *   direction?: ?value-of<ListMessagesRequestDirection>,
     * } $values
     */
    public function __construct(
        array $values = [],
    ) {
        $this->limit = $values['limit'] ?? null;
        if (array_key_exists('limit', $values)) {
            $this->_setField('limit');
        }
        $this->after = $values['after'] ?? null;
        if (array_key_exists('after', $values)) {
            $this->_setField('after');
        }
        $this->direction = $values['direction'] ?? null;
        if (array_key_exists('direction', $values)) {
            $this->_setField('direction');
        }
    }
}
