<?php

namespace Coss\Scheduling\Reassignments\Requests;

use Coss\Core\Json\JsonSerializableType;
use Coss\Types\SchedulingReassignmentSelection;
use Coss\Core\Json\JsonProperty;
use Coss\Types\SchedulingReassignmentStrategy;
use Coss\Scheduling\Reassignments\Types\PreviewSchedulingReassignmentRequestOverridesItem;
use Coss\Core\Types\ArrayType;

class PreviewSchedulingReassignmentRequest extends JsonSerializableType
{
    /**
     * @var SchedulingReassignmentSelection $selection
     */
    #[JsonProperty('selection')]
    public SchedulingReassignmentSelection $selection;

    /**
     * @var ?SchedulingReassignmentStrategy $strategy
     */
    #[JsonProperty('strategy')]
    public ?SchedulingReassignmentStrategy $strategy;

    /**
     * @var ?array<value-of<PreviewSchedulingReassignmentRequestOverridesItem>> $overrides
     */
    #[JsonProperty('overrides'), ArrayType(['string'])]
    public ?array $overrides;

    /**
     * @param array{
     *   selection: SchedulingReassignmentSelection,
     *   strategy?: ?SchedulingReassignmentStrategy,
     *   overrides?: ?array<value-of<PreviewSchedulingReassignmentRequestOverridesItem>>,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->selection = $values['selection'];
        $this->strategy = $values['strategy'] ?? null;
        if (array_key_exists('strategy', $values)) {
            $this->_setField('strategy');
        }
        $this->overrides = $values['overrides'] ?? null;
        if (array_key_exists('overrides', $values)) {
            $this->_setField('overrides');
        }
    }
}
