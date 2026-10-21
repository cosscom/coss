<?php

namespace Coss\Billing\Requests;

use Coss\Core\Json\JsonSerializableType;
use DateTime;
use Coss\Billing\Types\UsageBillingRequestGranularity;
use Coss\Billing\Types\UsageBillingRequestGroupBy;
use Coss\Billing\Types\UsageBillingRequestMeter;

class UsageBillingRequest extends JsonSerializableType
{
    /**
     * @var ?DateTime $from Start (inclusive). Defaults to the start of the current billing month.
     */
    public ?DateTime $from;

    /**
     * @var ?DateTime $to End (exclusive). Defaults to now. At most 400 days after `from` (7 by hour).
     */
    public ?DateTime $to;

    /**
     * @var ?value-of<UsageBillingRequestGranularity> $granularity Bucket size (UTC). Defaults to `day`.
     */
    public ?string $granularity;

    /**
     * @var ?value-of<UsageBillingRequestGroupBy> $groupBy Split each bucket per environment.
     */
    public ?string $groupBy;

    /**
     * @var ?value-of<UsageBillingRequestMeter> $meter Only this meter.
     */
    public ?string $meter;

    /**
     * @param array{
     *   from?: ?DateTime,
     *   to?: ?DateTime,
     *   granularity?: ?value-of<UsageBillingRequestGranularity>,
     *   groupBy?: ?value-of<UsageBillingRequestGroupBy>,
     *   meter?: ?value-of<UsageBillingRequestMeter>,
     * } $values
     */
    public function __construct(
        array $values = [],
    ) {
        $this->from = $values['from'] ?? null;
        $this->to = $values['to'] ?? null;
        $this->granularity = $values['granularity'] ?? null;
        $this->groupBy = $values['groupBy'] ?? null;
        $this->meter = $values['meter'] ?? null;
    }
}
