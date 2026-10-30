<?php

namespace Coss\Email\Subaccounts\Types;

use Coss\Core\Json\JsonSerializableType;
use Coss\Core\Json\JsonProperty;

/**
 * Fields left out keep their value; `null` removes a quota.
 */
class CreateSubaccountRequestQuotas extends JsonSerializableType
{
    /**
     * @var ?int $recipientsPerDay
     */
    #[JsonProperty('recipients_per_day')]
    public ?int $recipientsPerDay;

    /**
     * @var ?int $recipientsPerSecond
     */
    #[JsonProperty('recipients_per_second')]
    public ?int $recipientsPerSecond;

    /**
     * @var ?int $burst
     */
    #[JsonProperty('burst')]
    public ?int $burst;

    /**
     * @param array{
     *   recipientsPerDay?: ?int,
     *   recipientsPerSecond?: ?int,
     *   burst?: ?int,
     * } $values
     */
    public function __construct(
        array $values = [],
    ) {
        $this->recipientsPerDay = $values['recipientsPerDay'] ?? null;
        if (array_key_exists('recipientsPerDay', $values)) {
            $this->_setField('recipientsPerDay');
        }
        $this->recipientsPerSecond = $values['recipientsPerSecond'] ?? null;
        if (array_key_exists('recipientsPerSecond', $values)) {
            $this->_setField('recipientsPerSecond');
        }
        $this->burst = $values['burst'] ?? null;
        if (array_key_exists('burst', $values)) {
            $this->_setField('burst');
        }
    }

    /**
     * @return string
     */
    public function __toString(): string
    {
        return $this->toJson();
    }
}
