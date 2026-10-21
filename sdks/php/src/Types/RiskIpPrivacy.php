<?php

namespace Coss\Types;

use Coss\Core\Json\JsonSerializableType;
use Coss\Core\Json\JsonProperty;

class RiskIpPrivacy extends JsonSerializableType
{
    /**
     * @var bool $vpn
     */
    #[JsonProperty('vpn')]
    public bool $vpn;

    /**
     * @var bool $proxy
     */
    #[JsonProperty('proxy')]
    public bool $proxy;

    /**
     * @var bool $relay
     */
    #[JsonProperty('relay')]
    public bool $relay;

    /**
     * @var ?string $service The VPN or proxy service.
     */
    #[JsonProperty('service')]
    public ?string $service;

    /**
     * @param array{
     *   vpn: bool,
     *   proxy: bool,
     *   relay: bool,
     *   service?: ?string,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->vpn = $values['vpn'];
        $this->proxy = $values['proxy'];
        $this->relay = $values['relay'];
        $this->service = $values['service'] ?? null;
        if (array_key_exists('service', $values)) {
            $this->_setField('service');
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
