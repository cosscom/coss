<?php

namespace Coss\Sms\Suppressions\Requests;

use Coss\Core\Json\JsonSerializableType;

class ListSuppressionsRequest extends JsonSerializableType
{
    /**
     * @var ?string $phoneNumber Only this number's entry.
     */
    public ?string $phoneNumber;

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
     *   phoneNumber?: ?string,
     *   limit?: ?int,
     *   after?: ?string,
     * } $values
     */
    public function __construct(
        array $values = [],
    ) {
        $this->phoneNumber = $values['phoneNumber'] ?? null;
        if (array_key_exists('phoneNumber', $values)) {
            $this->_setField('phoneNumber');
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
