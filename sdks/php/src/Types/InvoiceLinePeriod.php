<?php

namespace Coss\Types;

use Coss\Core\Json\JsonSerializableType;
use DateTime;
use Coss\Core\Json\JsonProperty;
use Coss\Core\Types\Date;

class InvoiceLinePeriod extends JsonSerializableType
{
    /**
     * @var DateTime $start
     */
    #[JsonProperty('start'), Date(Date::TYPE_DATETIME)]
    public DateTime $start;

    /**
     * @var DateTime $end
     */
    #[JsonProperty('end'), Date(Date::TYPE_DATETIME)]
    public DateTime $end;

    /**
     * @param array{
     *   start: DateTime,
     *   end: DateTime,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->start = $values['start'];
        $this->end = $values['end'];
    }

    /**
     * @return string
     */
    public function __toString(): string
    {
        return $this->toJson();
    }
}
