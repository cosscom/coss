<?php

namespace Coss\Email\Subaccounts\Requests;

use Coss\Core\Json\JsonSerializableType;
use DateTime;

class StatsSubaccountsRequest extends JsonSerializableType
{
    /**
     * @var ?DateTime $from First day (UTC, `YYYY-MM-DD`); default 30 days before `to`.
     */
    public ?DateTime $from;

    /**
     * @var ?DateTime $to Last day (UTC, `YYYY-MM-DD`), included; default today.
     */
    public ?DateTime $to;

    /**
     * @param array{
     *   from?: ?DateTime,
     *   to?: ?DateTime,
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
    }
}
