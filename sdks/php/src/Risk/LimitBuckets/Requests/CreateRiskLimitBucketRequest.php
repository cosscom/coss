<?php

namespace Coss\Risk\LimitBuckets\Requests;

use Coss\Core\Json\JsonSerializableType;
use Coss\Core\Json\JsonProperty;
use Coss\Risk\LimitBuckets\Types\CreateRiskLimitBucketRequestOnFailure;

class CreateRiskLimitBucketRequest extends JsonSerializableType
{
    /**
     * @var string $name Unique in the environment; can't be changed.
     */
    #[JsonProperty('name')]
    public string $name;

    /**
     * @var int $limit Tokens added per `period_seconds`.
     */
    #[JsonProperty('limit')]
    public int $limit;

    /**
     * @var int $periodSeconds 1 second to 1 day.
     */
    #[JsonProperty('period_seconds')]
    public int $periodSeconds;

    /**
     * @var ?int $burst How many requests a key can make at once. Defaults to `limit`.
     */
    #[JsonProperty('burst')]
    public ?int $burst;

    /**
     * @var ?value-of<CreateRiskLimitBucketRequestOnFailure> $onFailure The answer while coss.com can't count. Defaults to `allow`.
     */
    #[JsonProperty('on_failure')]
    public ?string $onFailure;

    /**
     * @param array{
     *   name: string,
     *   limit: int,
     *   periodSeconds: int,
     *   burst?: ?int,
     *   onFailure?: ?value-of<CreateRiskLimitBucketRequestOnFailure>,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->name = $values['name'];
        $this->limit = $values['limit'];
        $this->periodSeconds = $values['periodSeconds'];
        $this->burst = $values['burst'] ?? null;
        if (array_key_exists('burst', $values)) {
            $this->_setField('burst');
        }
        $this->onFailure = $values['onFailure'] ?? null;
        if (array_key_exists('onFailure', $values)) {
            $this->_setField('onFailure');
        }
    }
}
