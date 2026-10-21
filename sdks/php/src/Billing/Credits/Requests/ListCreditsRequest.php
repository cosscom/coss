<?php

namespace Coss\Billing\Credits\Requests;

use Coss\Core\Json\JsonSerializableType;
use Coss\Billing\Credits\Types\ListCreditsRequestStatus;

class ListCreditsRequest extends JsonSerializableType
{
    /**
     * @var ?value-of<ListCreditsRequestStatus> $status `active` (default): usable now or later, with something left; `all`: every credit, newest first.
     */
    public ?string $status;

    /**
     * @var ?string $after Continue after this id (the last of the previous page).
     */
    public ?string $after;

    /**
     * @var ?int $limit At most this many (default 20).
     */
    public ?int $limit;

    /**
     * @param array{
     *   status?: ?value-of<ListCreditsRequestStatus>,
     *   after?: ?string,
     *   limit?: ?int,
     * } $values
     */
    public function __construct(
        array $values = [],
    ) {
        $this->status = $values['status'] ?? null;
        $this->after = $values['after'] ?? null;
        $this->limit = $values['limit'] ?? null;
    }
}
