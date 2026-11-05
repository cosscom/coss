<?php

namespace Coss\Types;

use Coss\Core\Json\JsonSerializableType;
use Coss\Core\Json\JsonProperty;
use Coss\Core\Types\ArrayType;

class SchedulingReassignmentStrategy extends JsonSerializableType
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
     * @var ?value-of<SchedulingReassignmentStrategyOtherwise> $otherwise After `preferred_hosts`: `auto` picks the fairest who's free, `leave` keeps it where it is.
     */
    #[JsonProperty('otherwise')]
    public ?string $otherwise;

    /**
     * @var ?array<SchedulingReassignmentStrategyAssignmentsItem> $assignments Who each goes to: a preview, with your changes.
     */
    #[JsonProperty('assignments'), ArrayType([SchedulingReassignmentStrategyAssignmentsItem::class])]
    public ?array $assignments;

    /**
     * @param array{
     *   toHost?: ?string,
     *   preferredHosts?: ?array<string>,
     *   otherwise?: ?value-of<SchedulingReassignmentStrategyOtherwise>,
     *   assignments?: ?array<SchedulingReassignmentStrategyAssignmentsItem>,
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
        $this->assignments = $values['assignments'] ?? null;
        if (array_key_exists('assignments', $values)) {
            $this->_setField('assignments');
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
