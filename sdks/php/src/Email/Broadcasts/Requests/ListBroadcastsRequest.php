<?php

namespace Coss\Email\Broadcasts\Requests;

use Coss\Core\Json\JsonSerializableType;
use Coss\Email\Broadcasts\Types\ListBroadcastsRequestStatus;

class ListBroadcastsRequest extends JsonSerializableType
{
    /**
     * @var ?value-of<ListBroadcastsRequestStatus> $status
     */
    public ?string $status;

    /**
     * @var ?int $limit 1-100, default 50.
     */
    public ?int $limit;

    /**
     * @var ?string $after Cursor: the `id` of the last broadcast of the previous page.
     */
    public ?string $after;

    /**
     * @param array{
     *   status?: ?value-of<ListBroadcastsRequestStatus>,
     *   limit?: ?int,
     *   after?: ?string,
     * } $values
     */
    public function __construct(
        array $values = [],
    ) {
        $this->status = $values['status'] ?? null;
        $this->limit = $values['limit'] ?? null;
        $this->after = $values['after'] ?? null;
    }
}
