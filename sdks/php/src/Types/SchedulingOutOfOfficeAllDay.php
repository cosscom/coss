<?php

namespace Coss\Types;

use Coss\Core\Json\JsonSerializableType;
use Coss\Core\Json\JsonProperty;

/**
 * How it was given, when it was as whole dates.
 */
class SchedulingOutOfOfficeAllDay extends JsonSerializableType
{
    /**
     * @var string $startDate
     */
    #[JsonProperty('start_date')]
    public string $startDate;

    /**
     * @var string $endDate
     */
    #[JsonProperty('end_date')]
    public string $endDate;

    /**
     * @var string $timeZone
     */
    #[JsonProperty('time_zone')]
    public string $timeZone;

    /**
     * @param array{
     *   startDate: string,
     *   endDate: string,
     *   timeZone: string,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->startDate = $values['startDate'];
        $this->endDate = $values['endDate'];
        $this->timeZone = $values['timeZone'];
    }

    /**
     * @return string
     */
    public function __toString(): string
    {
        return $this->toJson();
    }
}
