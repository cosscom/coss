<?php

namespace Coss\Email\Subaccounts\Requests;

use Coss\Core\Json\JsonSerializableType;

class ListSubaccountsRequest extends JsonSerializableType
{
    /**
     * @var ?int $limit 1-100, default 50.
     */
    public ?int $limit;

    /**
     * @var ?string $after The last `id` of the previous page.
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
        if (array_key_exists('limit', $values)) {
            $this->_setField('limit');
        }
        $this->after = $values['after'] ?? null;
        if (array_key_exists('after', $values)) {
            $this->_setField('after');
        }
    }
}
