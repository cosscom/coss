<?php

namespace Coss\Email\Templates\Versions\Requests;

use Coss\Core\Json\JsonSerializableType;

class ListVersionsRequest extends JsonSerializableType
{
    /**
     * @var ?int $limit 1-20, default 10.
     */
    public ?int $limit;

    /**
     * @var ?int $after Cursor: the `version` of the last version of the previous page.
     */
    public ?int $after;

    /**
     * @param array{
     *   limit?: ?int,
     *   after?: ?int,
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
