<?php

namespace Coss\Risk\Rules\Requests;

use Coss\Core\Json\JsonSerializableType;
use Coss\Core\Json\JsonProperty;
use Coss\Types\RiskEvent;
use Coss\Core\Types\ArrayType;
use Coss\Risk\Rules\Types\UpdateRiskRuleRequestMatch;
use Coss\Types\RiskRuleCondition;
use Coss\Types\RiskDecision;

class UpdateRiskRuleRequest extends JsonSerializableType
{
    /**
     * @var ?string $name
     */
    #[JsonProperty('name')]
    public ?string $name;

    /**
     * @var ?bool $enabled
     */
    #[JsonProperty('enabled')]
    public ?bool $enabled;

    /**
     * @var ?int $position
     */
    #[JsonProperty('position')]
    public ?int $position;

    /**
     * @var ?array<value-of<RiskEvent>> $events
     */
    #[JsonProperty('events'), ArrayType(['string'])]
    public ?array $events;

    /**
     * @var ?value-of<UpdateRiskRuleRequestMatch> $match
     */
    #[JsonProperty('match')]
    public ?string $match;

    /**
     * @var ?array<RiskRuleCondition> $conditions
     */
    #[JsonProperty('conditions'), ArrayType([RiskRuleCondition::class])]
    public ?array $conditions;

    /**
     * @var ?value-of<RiskDecision> $action
     */
    #[JsonProperty('action')]
    public ?string $action;

    /**
     * @param array{
     *   name?: ?string,
     *   enabled?: ?bool,
     *   position?: ?int,
     *   events?: ?array<value-of<RiskEvent>>,
     *   match?: ?value-of<UpdateRiskRuleRequestMatch>,
     *   conditions?: ?array<RiskRuleCondition>,
     *   action?: ?value-of<RiskDecision>,
     * } $values
     */
    public function __construct(
        array $values = [],
    ) {
        $this->name = $values['name'] ?? null;
        $this->enabled = $values['enabled'] ?? null;
        $this->position = $values['position'] ?? null;
        $this->events = $values['events'] ?? null;
        $this->match = $values['match'] ?? null;
        $this->conditions = $values['conditions'] ?? null;
        $this->action = $values['action'] ?? null;
    }
}
