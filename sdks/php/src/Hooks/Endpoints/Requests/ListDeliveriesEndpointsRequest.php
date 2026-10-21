<?php

namespace Coss\Hooks\Endpoints\Requests;

use Coss\Core\Json\JsonSerializableType;
use Coss\Hooks\Endpoints\Types\ListDeliveriesEndpointsRequestStatus;

class ListDeliveriesEndpointsRequest extends JsonSerializableType
{
    /**
     * @var ?value-of<ListDeliveriesEndpointsRequestStatus> $status Only deliveries with this status.
     */
    public ?string $status;

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
     *   status?: ?value-of<ListDeliveriesEndpointsRequestStatus>,
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
