<?php

namespace Coss\Scheduling\Bookings\Types;

use Coss\Core\Json\JsonSerializableType;
use Coss\Core\Json\JsonProperty;
use Coss\Core\Types\ArrayType;

class ReassignSchedulingBookingRequestChangesItem extends JsonSerializableType
{
    /**
     * @var ?string $fromHost The host leaving, by id or uid. Needed when it could be several.
     */
    #[JsonProperty('from_host')]
    public ?string $fromHost;

    /**
     * @var ?string $toHost The host taking over, by id or uid. Or set `auto`.
     */
    #[JsonProperty('to_host')]
    public ?string $toHost;

    /**
     * @var ?bool $auto Let coss.com pick, as a pool would: the fairest who's free and fits what the booking was routed with.
     */
    #[JsonProperty('auto')]
    public ?bool $auto;

    /**
     * @var ?array<string> $preferredHosts With `auto`: try these first, in order.
     */
    #[JsonProperty('preferred_hosts'), ArrayType(['string'])]
    public ?array $preferredHosts;

    /**
     * @param array{
     *   fromHost?: ?string,
     *   toHost?: ?string,
     *   auto?: ?bool,
     *   preferredHosts?: ?array<string>,
     * } $values
     */
    public function __construct(
        array $values = [],
    ) {
        $this->fromHost = $values['fromHost'] ?? null;
        if (array_key_exists('fromHost', $values)) {
            $this->_setField('fromHost');
        }
        $this->toHost = $values['toHost'] ?? null;
        if (array_key_exists('toHost', $values)) {
            $this->_setField('toHost');
        }
        $this->auto = $values['auto'] ?? null;
        if (array_key_exists('auto', $values)) {
            $this->_setField('auto');
        }
        $this->preferredHosts = $values['preferredHosts'] ?? null;
        if (array_key_exists('preferredHosts', $values)) {
            $this->_setField('preferredHosts');
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
