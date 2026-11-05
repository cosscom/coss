<?php

namespace Coss\Scheduling\OutOfOffice\Types;

use Coss\Core\Json\JsonSerializableType;
use Coss\Core\Json\JsonProperty;
use Coss\Core\Types\ArrayType;

/**
 * With `existing_bookings: reassign`: who they go to. Default: the fairest who's free.
 */
class PutSchedulingOutOfOfficeRequestReassign extends JsonSerializableType
{
    /**
     * @var ?string $toHost Give them all to this host.
     */
    #[JsonProperty('to_host')]
    public ?string $toHost;

    /**
     * @var ?array<string> $preferredHosts Try these first, in order.
     */
    #[JsonProperty('preferred_hosts'), ArrayType(['string'])]
    public ?array $preferredHosts;

    /**
     * @var ?value-of<PutSchedulingOutOfOfficeRequestReassignOtherwise> $otherwise After `preferred_hosts`: `auto` picks the fairest who's free (the default), `leave` keeps it where it is.
     */
    #[JsonProperty('otherwise')]
    public ?string $otherwise;

    /**
     * @param array{
     *   toHost?: ?string,
     *   preferredHosts?: ?array<string>,
     *   otherwise?: ?value-of<PutSchedulingOutOfOfficeRequestReassignOtherwise>,
     * } $values
     */
    public function __construct(
        array $values = [],
    ) {
        $this->toHost = $values['toHost'] ?? null;
        if (array_key_exists('toHost', $values)) {
            $this->_setField('toHost');
        }
        $this->preferredHosts = $values['preferredHosts'] ?? null;
        if (array_key_exists('preferredHosts', $values)) {
            $this->_setField('preferredHosts');
        }
        $this->otherwise = $values['otherwise'] ?? null;
        if (array_key_exists('otherwise', $values)) {
            $this->_setField('otherwise');
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
