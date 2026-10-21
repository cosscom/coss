<?php

namespace Coss\Risk\Rules\Requests;

use Coss\Core\Json\JsonSerializableType;
use Coss\Core\Json\JsonProperty;
use Coss\Types\RiskEvent;
use Coss\Core\Types\ArrayType;
use Coss\Risk\Rules\Types\CreateRiskRuleRequestMatch;
use Coss\Types\RiskRuleCondition;
use Coss\Types\RiskDecision;

class CreateRiskRuleRequest extends JsonSerializableType
{
    /**
     * @var string $name
     */
    #[JsonProperty('name')]
    public string $name;

    /**
     * @var ?bool $enabled
     */
    #[JsonProperty('enabled')]
    public ?bool $enabled;

    /**
     * @var ?int $position Default 0.
     */
    #[JsonProperty('position')]
    public ?int $position;

    /**
     * @var ?array<value-of<RiskEvent>> $events
     */
    #[JsonProperty('events'), ArrayType(['string'])]
    public ?array $events;

    /**
     * @var ?value-of<CreateRiskRuleRequestMatch> $match Default `all`.
     */
    #[JsonProperty('match')]
    public ?string $match;

    /**
     * @var array<RiskRuleCondition> $conditions
     */
    #[JsonProperty('conditions'), ArrayType([RiskRuleCondition::class])]
    public array $conditions;

    /**
     * @var value-of<RiskDecision> $action
     */
    #[JsonProperty('action')]
    public string $action;

    /**
     * @param array{
     *   name: string,
     *   conditions: array<RiskRuleCondition>,
     *   action: value-of<RiskDecision>,
     *   enabled?: ?bool,
     *   position?: ?int,
     *   events?: ?array<value-of<RiskEvent>>,
     *   match?: ?value-of<CreateRiskRuleRequestMatch>,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->name = $values['name'];
        $this->enabled = $values['enabled'] ?? null;
        $this->position = $values['position'] ?? null;
        $this->events = $values['events'] ?? null;
        $this->match = $values['match'] ?? null;
        $this->conditions = $values['conditions'];
        $this->action = $values['action'];
    }
}
