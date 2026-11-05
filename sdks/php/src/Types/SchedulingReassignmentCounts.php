<?php

namespace Coss\Types;

use Coss\Core\Json\JsonSerializableType;
use Coss\Core\Json\JsonProperty;

class SchedulingReassignmentCounts extends JsonSerializableType
{
    /**
     * @var float $total
     */
    #[JsonProperty('total')]
    public float $total;

    /**
     * @var float $pending
     */
    #[JsonProperty('pending')]
    public float $pending;

    /**
     * @var float $reassigned
     */
    #[JsonProperty('reassigned')]
    public float $reassigned;

    /**
     * @var float $skipped They'd moved on since it was selected.
     */
    #[JsonProperty('skipped')]
    public float $skipped;

    /**
     * @var float $noCandidate Nobody could take them: they stayed.
     */
    #[JsonProperty('no_candidate')]
    public float $noCandidate;

    /**
     * @var float $failed
     */
    #[JsonProperty('failed')]
    public float $failed;

    /**
     * @var float $cancelled
     */
    #[JsonProperty('cancelled')]
    public float $cancelled;

    /**
     * @param array{
     *   total: float,
     *   pending: float,
     *   reassigned: float,
     *   skipped: float,
     *   noCandidate: float,
     *   failed: float,
     *   cancelled: float,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->total = $values['total'];
        $this->pending = $values['pending'];
        $this->reassigned = $values['reassigned'];
        $this->skipped = $values['skipped'];
        $this->noCandidate = $values['noCandidate'];
        $this->failed = $values['failed'];
        $this->cancelled = $values['cancelled'];
    }

    /**
     * @return string
     */
    public function __toString(): string
    {
        return $this->toJson();
    }
}
