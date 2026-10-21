<?php

namespace Coss\Email\Suppressions\Requests;

use Coss\Core\Json\JsonSerializableType;
use Coss\Types\ListSuppressionsRequestScopeZero;
use Coss\Types\ListSuppressionsRequestScopeOne;

class ListSuppressionsRequest extends JsonSerializableType
{
    /**
     * @var ?string $address Only entries for this address.
     */
    public ?string $address;

    /**
     * @var (
     *    value-of<ListSuppressionsRequestScopeZero>
     *   |value-of<ListSuppressionsRequestScopeOne>
     *   |string
     * )|null $scope Only entries with this scope.
     */
    public string|null $scope;

    /**
     * @var ?int $limit 1-100, default 50.
     */
    public ?int $limit;

    /**
     * @var ?string $after Cursor: the `id` of the last entry of the previous page.
     */
    public ?string $after;

    /**
     * @param array{
     *   address?: ?string,
     *   scope?: (
     *    value-of<ListSuppressionsRequestScopeZero>
     *   |value-of<ListSuppressionsRequestScopeOne>
     *   |string
     * )|null,
     *   limit?: ?int,
     *   after?: ?string,
     * } $values
     */
    public function __construct(
        array $values = [],
    ) {
        $this->address = $values['address'] ?? null;
        if (array_key_exists('address', $values)) {
            $this->_setField('address');
        }
        $this->scope = $values['scope'] ?? null;
        if (array_key_exists('scope', $values)) {
            $this->_setField('scope');
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
