<?php

namespace Coss\Sms\Received\Requests;

use Coss\Core\Json\JsonSerializableType;
use DateTime;

class ListReceivedRequest extends JsonSerializableType
{
    /**
     * @var ?string $from Only messages from this number.
     */
    public ?string $from;

    /**
     * @var ?string $to Only messages to this number of yours.
     */
    public ?string $to;

    /**
     * @var ?DateTime $createdAfter
     */
    public ?DateTime $createdAfter;

    /**
     * @var ?DateTime $createdBefore
     */
    public ?DateTime $createdBefore;

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
     *   from?: ?string,
     *   to?: ?string,
     *   createdAfter?: ?DateTime,
     *   createdBefore?: ?DateTime,
     *   limit?: ?int,
     *   after?: ?string,
     * } $values
     */
    public function __construct(
        array $values = [],
    ) {
        $this->from = $values['from'] ?? null;
        if (array_key_exists('from', $values)) {
            $this->_setField('from');
        }
        $this->to = $values['to'] ?? null;
        if (array_key_exists('to', $values)) {
            $this->_setField('to');
        }
        $this->createdAfter = $values['createdAfter'] ?? null;
        if (array_key_exists('createdAfter', $values)) {
            $this->_setField('createdAfter');
        }
        $this->createdBefore = $values['createdBefore'] ?? null;
        if (array_key_exists('createdBefore', $values)) {
            $this->_setField('createdBefore');
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
