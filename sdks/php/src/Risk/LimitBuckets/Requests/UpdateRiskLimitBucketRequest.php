<?php

namespace Coss\Risk\LimitBuckets\Requests;

use Coss\Core\Json\JsonSerializableType;
use Coss\Core\Json\JsonProperty;
use Coss\Risk\LimitBuckets\Types\UpdateRiskLimitBucketRequestOnFailure;

class UpdateRiskLimitBucketRequest extends JsonSerializableType
{
    /**
     * @var ?int $limit
     */
    #[JsonProperty('limit')]
    public ?int $limit;

    /**
     * @var ?int $periodSeconds
     */
    #[JsonProperty('period_seconds')]
    public ?int $periodSeconds;

    /**
     * @var ?int $burst
     */
    #[JsonProperty('burst')]
    public ?int $burst;

    /**
     * @var ?value-of<UpdateRiskLimitBucketRequestOnFailure> $onFailure
     */
    #[JsonProperty('on_failure')]
    public ?string $onFailure;

    /**
     * @param array{
     *   limit?: ?int,
     *   periodSeconds?: ?int,
     *   burst?: ?int,
     *   onFailure?: ?value-of<UpdateRiskLimitBucketRequestOnFailure>,
     * } $values
     */
    public function __construct(
        array $values = [],
    ) {
        $this->limit = $values['limit'] ?? null;
        $this->periodSeconds = $values['periodSeconds'] ?? null;
        $this->burst = $values['burst'] ?? null;
        $this->onFailure = $values['onFailure'] ?? null;
    }
}
