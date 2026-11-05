<?php

namespace Coss\Types;

use Coss\Core\Json\JsonSerializableType;
use Coss\Core\Json\JsonProperty;

class SchedulingReassignmentStrategyAssignmentsItem extends JsonSerializableType
{
    /**
     * @var string $booking
     */
    #[JsonProperty('booking')]
    public string $booking;

    /**
     * @var string $toHost
     */
    #[JsonProperty('to_host')]
    public string $toHost;

    /**
     * @var ?string $fromHost
     */
    #[JsonProperty('from_host')]
    public ?string $fromHost;

    /**
     * @param array{
     *   booking: string,
     *   toHost: string,
     *   fromHost?: ?string,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->booking = $values['booking'];
        $this->toHost = $values['toHost'];
        $this->fromHost = $values['fromHost'] ?? null;
        if (array_key_exists('fromHost', $values)) {
            $this->_setField('fromHost');
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
