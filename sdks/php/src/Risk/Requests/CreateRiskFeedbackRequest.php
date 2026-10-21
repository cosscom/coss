<?php

namespace Coss\Risk\Requests;

use Coss\Core\Json\JsonSerializableType;
use Coss\Types\RiskOutcome;
use Coss\Core\Json\JsonProperty;

class CreateRiskFeedbackRequest extends JsonSerializableType
{
    /**
     * @var value-of<RiskOutcome> $outcome
     */
    #[JsonProperty('outcome')]
    public string $outcome;

    /**
     * @var ?string $note For your team; never shared.
     */
    #[JsonProperty('note')]
    public ?string $note;

    /**
     * @param array{
     *   outcome: value-of<RiskOutcome>,
     *   note?: ?string,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->outcome = $values['outcome'];
        $this->note = $values['note'] ?? null;
    }
}
