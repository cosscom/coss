<?php

namespace Coss\Hooks\EventTypes\Requests;

use Coss\Core\Json\JsonSerializableType;
use Coss\Hooks\EventTypes\Types\ListEventTypesRequestIncludeArchived;

class ListEventTypesRequest extends JsonSerializableType
{
    /**
     * @var ?value-of<ListEventTypesRequestIncludeArchived> $includeArchived Also list archived types (default `false`).
     */
    public ?string $includeArchived;

    /**
     * @var ?int $limit 1-100, default 50.
     */
    public ?int $limit;

    /**
     * @var ?string $after Cursor: the `name` of the last type of the previous page.
     */
    public ?string $after;

    /**
     * @param array{
     *   includeArchived?: ?value-of<ListEventTypesRequestIncludeArchived>,
     *   limit?: ?int,
     *   after?: ?string,
     * } $values
     */
    public function __construct(
        array $values = [],
    ) {
        $this->includeArchived = $values['includeArchived'] ?? null;
        if (array_key_exists('includeArchived', $values)) {
            $this->_setField('includeArchived');
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
