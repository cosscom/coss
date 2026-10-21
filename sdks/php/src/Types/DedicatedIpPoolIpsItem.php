<?php

namespace Coss\Types;

use Coss\Core\Json\JsonSerializableType;
use Coss\Core\Json\JsonProperty;

class DedicatedIpPoolIpsItem extends JsonSerializableType
{
    /**
     * @var string $ip An IPv4 address of the pool.
     */
    #[JsonProperty('ip')]
    public string $ip;

    /**
     * @var int $delivered7D Deliveries from it in the last 7 days.
     */
    #[JsonProperty('delivered_7d')]
    public int $delivered7D;

    /**
     * @param array{
     *   ip: string,
     *   delivered7D: int,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->ip = $values['ip'];
        $this->delivered7D = $values['delivered7D'];
    }

    /**
     * @return string
     */
    public function __toString(): string
    {
        return $this->toJson();
    }
}
