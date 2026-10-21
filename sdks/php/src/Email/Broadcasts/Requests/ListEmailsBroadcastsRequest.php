<?php

namespace Coss\Email\Broadcasts\Requests;

use Coss\Core\Json\JsonSerializableType;

class ListEmailsBroadcastsRequest extends JsonSerializableType
{
    /**
     * @var ?int $limit 1-100, default 50.
     */
    public ?int $limit;

    /**
     * @var ?string $after Cursor: the `id` of the last email of the previous page.
     */
    public ?string $after;

    /**
     * @param array{
     *   limit?: ?int,
     *   after?: ?string,
     * } $values
     */
    public function __construct(
        array $values = [],
    ) {
        $this->limit = $values['limit'] ?? null;
        $this->after = $values['after'] ?? null;
    }
}
