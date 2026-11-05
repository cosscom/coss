<?php

namespace Coss\Types;

use Coss\Core\Json\JsonSerializableType;
use Coss\Core\Json\JsonProperty;

class SchedulingHolidayListDataItem extends JsonSerializableType
{
    /**
     * @var string $date
     */
    #[JsonProperty('date')]
    public string $date;

    /**
     * @var string $name
     */
    #[JsonProperty('name')]
    public string $name;

    /**
     * @var ?string $region
     */
    #[JsonProperty('region')]
    public ?string $region;

    /**
     * @param array{
     *   date: string,
     *   name: string,
     *   region?: ?string,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->date = $values['date'];
        $this->name = $values['name'];
        $this->region = $values['region'] ?? null;
        if (array_key_exists('region', $values)) {
            $this->_setField('region');
        }
    }

    /**
     * @return string
     */
    public function __toString(): string
    {
        return $this->toJson();
    }
}
