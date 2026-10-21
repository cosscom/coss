<?php

namespace Coss\Domains\Dmarc\Reports\Requests;

use Coss\Core\Json\JsonSerializableType;

class ListReportsRequest extends JsonSerializableType
{
    /**
     * @var ?int $limit 1-100, default 20.
     */
    public ?int $limit;

    /**
     * @var ?string $after Cursor: the `id` of the last report of the previous page.
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
