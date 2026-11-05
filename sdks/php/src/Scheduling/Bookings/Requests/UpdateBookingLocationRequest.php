<?php

namespace Coss\Scheduling\Bookings\Requests;

use Coss\Core\Json\JsonSerializableType;
use Coss\Types\SchedulingLocationZero;
use Coss\Types\SchedulingLocationNumber;
use Coss\Types\SchedulingLocationAddress;
use Coss\Types\SchedulingLocationThree;
use Coss\Types\SchedulingLocationFour;
use Coss\Types\SchedulingLocationFive;
use Coss\Core\Json\JsonProperty;
use Coss\Core\Types\Union;

class UpdateBookingLocationRequest extends JsonSerializableType
{
    /**
     * @var (
     *    SchedulingLocationZero
     *   |SchedulingLocationNumber
     *   |SchedulingLocationAddress
     *   |SchedulingLocationThree
     *   |SchedulingLocationFour
     *   |SchedulingLocationFive
     * )|null $location
     */
    #[JsonProperty('location'), Union(SchedulingLocationZero::class, SchedulingLocationNumber::class, SchedulingLocationAddress::class, SchedulingLocationThree::class, SchedulingLocationFour::class, SchedulingLocationFive::class, 'null')]
    public SchedulingLocationZero|SchedulingLocationNumber|SchedulingLocationAddress|SchedulingLocationThree|SchedulingLocationFour|SchedulingLocationFive|null $location;

    /**
     * @param array{
     *   location?: (
     *    SchedulingLocationZero
     *   |SchedulingLocationNumber
     *   |SchedulingLocationAddress
     *   |SchedulingLocationThree
     *   |SchedulingLocationFour
     *   |SchedulingLocationFive
     * )|null,
     * } $values
     */
    public function __construct(
        array $values = [],
    ) {
        $this->location = $values['location'] ?? null;
        if (array_key_exists('location', $values)) {
            $this->_setField('location');
        }
    }
}
