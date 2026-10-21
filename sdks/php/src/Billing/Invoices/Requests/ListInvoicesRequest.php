<?php

namespace Coss\Billing\Invoices\Requests;

use Coss\Core\Json\JsonSerializableType;
use Coss\Billing\Invoices\Types\ListInvoicesRequestStatus;

class ListInvoicesRequest extends JsonSerializableType
{
    /**
     * @var ?value-of<ListInvoicesRequestStatus> $status Only invoices in this status.
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
     *   status?: ?value-of<ListInvoicesRequestStatus>,
     *   after?: ?string,
     *   limit?: ?int,
     * } $values
     */
    public function __construct(
        array $values = [],
    ) {
        $this->status = $values['status'] ?? null;
        if (array_key_exists('status', $values)) {
            $this->_setField('status');
        }
        $this->after = $values['after'] ?? null;
        if (array_key_exists('after', $values)) {
            $this->_setField('after');
        }
        $this->limit = $values['limit'] ?? null;
        if (array_key_exists('limit', $values)) {
            $this->_setField('limit');
        }
    }
}
