<?php

namespace Coss\WebhookEndpoints\Deliveries\Requests;

use Coss\Core\Json\JsonSerializableType;
use Coss\WebhookEndpoints\Deliveries\Types\ListDeliveriesRequestStatus;

class ListDeliveriesRequest extends JsonSerializableType
{
    /**
     * @var ?value-of<ListDeliveriesRequestStatus> $status Only deliveries with this status.
     */
    public ?string $status;

    /**
     * @var ?string $eventId Only the delivery of this event.
     */
    public ?string $eventId;

    /**
     * @var ?int $limit 1-100, default 50.
     */
    public ?int $limit;

    /**
     * @var ?string $after Cursor: the `id` of the last delivery of the previous page.
     */
    public ?string $after;

    /**
     * @param array{
     *   status?: ?value-of<ListDeliveriesRequestStatus>,
     *   eventId?: ?string,
     *   limit?: ?int,
     *   after?: ?string,
     * } $values
     */
    public function __construct(
        array $values = [],
    ) {
        $this->status = $values['status'] ?? null;
        if (array_key_exists('status', $values)) {
            $this->_setField('status');
        }
        $this->eventId = $values['eventId'] ?? null;
        if (array_key_exists('eventId', $values)) {
            $this->_setField('eventId');
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
