<?php

namespace Coss\Risk\Assessments\Requests;

use Coss\Core\Json\JsonSerializableType;
use Coss\Types\RiskEvent;
use Coss\Types\RiskDecision;
use Coss\Risk\Assessments\Types\ListAssessmentsRequestReviewStatus;

class ListAssessmentsRequest extends JsonSerializableType
{
    /**
     * @var ?value-of<RiskEvent> $event What is being assessed. `custom` events are named by `event_name`; velocity is counted per event.
     */
    public ?string $event;

    /**
     * @var ?value-of<RiskDecision> $decision `allow`: go ahead. `review`: suspicious; let it through with limits, or hold it for a person. `block`: refuse it.
     */
    public ?string $decision;

    /**
     * @var ?string $userId Only assessments of this user.
     */
    public ?string $userId;

    /**
     * @var ?value-of<ListAssessmentsRequestReviewStatus> $reviewStatus `open`: the review queue.
     */
    public ?string $reviewStatus;

    /**
     * @var ?int $limit 1-100, default 50.
     */
    public ?int $limit;

    /**
     * @var ?string $after Cursor: the `id` of the last entry of the previous page.
     */
    public ?string $after;

    /**
     * @param array{
     *   event?: ?value-of<RiskEvent>,
     *   decision?: ?value-of<RiskDecision>,
     *   userId?: ?string,
     *   reviewStatus?: ?value-of<ListAssessmentsRequestReviewStatus>,
     *   limit?: ?int,
     *   after?: ?string,
     * } $values
     */
    public function __construct(
        array $values = [],
    ) {
        $this->event = $values['event'] ?? null;
        $this->decision = $values['decision'] ?? null;
        $this->userId = $values['userId'] ?? null;
        $this->reviewStatus = $values['reviewStatus'] ?? null;
        $this->limit = $values['limit'] ?? null;
        $this->after = $values['after'] ?? null;
    }
}
