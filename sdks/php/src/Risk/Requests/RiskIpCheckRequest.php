<?php

namespace Coss\Risk\Requests;

use Coss\Core\Json\JsonSerializableType;
use Coss\Core\Json\JsonProperty;

class RiskIpCheckRequest extends JsonSerializableType
{
    /**
     * @var string $ip
     */
    #[JsonProperty('ip')]
    public string $ip;

    /**
     * @param array{
     *   ip: string,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->ip = $values['ip'];
    }
}
