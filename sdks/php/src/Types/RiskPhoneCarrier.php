<?php

namespace Coss\Types;

use Coss\Core\Json\JsonSerializableType;
use Coss\Core\Json\JsonProperty;

class RiskPhoneCarrier extends JsonSerializableType
{
    /**
     * @var ?string $name
     */
    #[JsonProperty('name')]
    public ?string $name;

    /**
     * @var ?string $mobileCountryCode
     */
    #[JsonProperty('mobile_country_code')]
    public ?string $mobileCountryCode;

    /**
     * @var ?string $mobileNetworkCode Only for mobile numbers.
     */
    #[JsonProperty('mobile_network_code')]
    public ?string $mobileNetworkCode;

    /**
     * @param array{
     *   name?: ?string,
     *   mobileCountryCode?: ?string,
     *   mobileNetworkCode?: ?string,
     * } $values
     */
    public function __construct(
        array $values = [],
    ) {
        $this->name = $values['name'] ?? null;
        if (array_key_exists('name', $values)) {
            $this->_setField('name');
        }
        $this->mobileCountryCode = $values['mobileCountryCode'] ?? null;
        if (array_key_exists('mobileCountryCode', $values)) {
            $this->_setField('mobileCountryCode');
        }
        $this->mobileNetworkCode = $values['mobileNetworkCode'] ?? null;
        if (array_key_exists('mobileNetworkCode', $values)) {
            $this->_setField('mobileNetworkCode');
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
