<?php

namespace Coss\Verify\Requests;

use Coss\Core\Json\JsonSerializableType;
use Coss\Verify\Types\ListVerifyRequestStatus;

class ListVerifyRequest extends JsonSerializableType
{
    /**
     * @var ?string $to Only verifications to this destination.
     */
    public ?string $to;

    /**
     * @var ?value-of<ListVerifyRequestStatus> $status Only verifications in this status.
     */
    public ?string $status;

    /**
     * @var ?int $limit 1-100, default 20.
     */
    public ?int $limit;

    /**
     * @var ?string $after Cursor: the `id` of the last item of the previous page.
     */
    public ?string $after;

    /**
     * @param array{
     *   to?: ?string,
     *   status?: ?value-of<ListVerifyRequestStatus>,
     *   limit?: ?int,
     *   after?: ?string,
     * } $values
     */
    public function __construct(
        array $values = [],
    ) {
        $this->to = $values['to'] ?? null;
        if (array_key_exists('to', $values)) {
            $this->_setField('to');
        }
        $this->status = $values['status'] ?? null;
        if (array_key_exists('status', $values)) {
            $this->_setField('status');
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
