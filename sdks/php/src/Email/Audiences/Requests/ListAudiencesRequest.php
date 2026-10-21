<?php

namespace Coss\Email\Audiences\Requests;

use Coss\Core\Json\JsonSerializableType;

class ListAudiencesRequest extends JsonSerializableType
{
    /**
     * @var ?int $limit 1-100, default 50.
     */
    public ?int $limit;

    /**
     * @var ?string $after Cursor: the `id` of the last item of the previous page.
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
