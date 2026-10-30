<?php

namespace Coss\Types;

use Coss\Core\Json\JsonSerializableType;
use Coss\Core\Json\JsonProperty;

class RiskPhoneSimSwap extends JsonSerializableType
{
    /**
     * @var bool $recent The SIM changed within `period`: someone may have taken the number over.
     */
    #[JsonProperty('recent')]
    public bool $recent;

    /**
     * @var ?string $swappedAt The last SIM change, where the carrier tells the date.
     */
    #[JsonProperty('swapped_at')]
    public ?string $swappedAt;

    /**
     * @var ?string $period What `recent` means, as an ISO 8601 duration (`PT48H`).
     */
    #[JsonProperty('period')]
    public ?string $period;

    /**
     * @param array{
     *   recent: bool,
     *   swappedAt?: ?string,
     *   period?: ?string,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->recent = $values['recent'];
        $this->swappedAt = $values['swappedAt'] ?? null;
        if (array_key_exists('swappedAt', $values)) {
            $this->_setField('swappedAt');
        }
        $this->period = $values['period'] ?? null;
        if (array_key_exists('period', $values)) {
            $this->_setField('period');
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
