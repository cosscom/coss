<?php

namespace Coss\Types;

use Coss\Core\Json\JsonSerializableType;
use Coss\Core\Json\JsonProperty;

class BillingPaymentMethod extends JsonSerializableType
{
    /**
     * @var string $type
     */
    #[JsonProperty('type')]
    public string $type;

    /**
     * @var ?string $brand
     */
    #[JsonProperty('brand')]
    public ?string $brand;

    /**
     * @var ?string $last4
     */
    #[JsonProperty('last4')]
    public ?string $last4;

    /**
     * @param array{
     *   type: string,
     *   brand?: ?string,
     *   last4?: ?string,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->type = $values['type'];
        $this->brand = $values['brand'] ?? null;
        if (array_key_exists('brand', $values)) {
            $this->_setField('brand');
        }
        $this->last4 = $values['last4'] ?? null;
        if (array_key_exists('last4', $values)) {
            $this->_setField('last4');
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
