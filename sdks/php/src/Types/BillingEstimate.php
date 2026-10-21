<?php

namespace Coss\Types;

use Coss\Core\Json\JsonSerializableType;
use Coss\Core\Json\JsonProperty;

/**
 * This month so far, as it would be invoiced if it ended now.
 */
class BillingEstimate extends JsonSerializableType
{
    /**
     * @var int $usage Usage this month at your rates.
     */
    #[JsonProperty('usage')]
    public int $usage;

    /**
     * @var int $discount An amount in cents (USD).
     */
    #[JsonProperty('discount')]
    public int $discount;

    /**
     * @var int $credit Credit applied to this estimate (your plan's fee is credit).
     */
    #[JsonProperty('credit')]
    public int $credit;

    /**
     * @var int $total Estimated total including usage and fees billed in arrears, after discounts and credits.
     */
    #[JsonProperty('total')]
    public int $total;

    /**
     * @param array{
     *   usage: int,
     *   discount: int,
     *   credit: int,
     *   total: int,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->usage = $values['usage'];
        $this->discount = $values['discount'];
        $this->credit = $values['credit'];
        $this->total = $values['total'];
    }

    /**
     * @return string
     */
    public function __toString(): string
    {
        return $this->toJson();
    }
}
