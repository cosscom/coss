<?php

namespace Coss\LogDrains\Batches\Requests;

use Coss\Core\Json\JsonSerializableType;
use Coss\LogDrains\Batches\Types\ListBatchesRequestStatus;

class ListBatchesRequest extends JsonSerializableType
{
    /**
     * @var ?value-of<ListBatchesRequestStatus> $status Only batches with this status.
     */
    public ?string $status;

    /**
     * @var ?int $limit 1-100, default 50.
     */
    public ?int $limit;

    /**
     * @var ?string $after Cursor: the `id` of the last batch of the previous page.
     */
    public ?string $after;

    /**
     * @param array{
     *   status?: ?value-of<ListBatchesRequestStatus>,
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
