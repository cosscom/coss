<?php

namespace Coss\Types;

use Coss\Core\Json\JsonSerializableType;
use Coss\Core\Json\JsonProperty;

class BroadcastTracking extends JsonSerializableType
{
    /**
     * @var bool $opens
     */
    #[JsonProperty('opens')]
    public bool $opens;

    /**
     * @var bool $clicks
     */
    #[JsonProperty('clicks')]
    public bool $clicks;

    /**
     * @param array{
     *   opens: bool,
     *   clicks: bool,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->opens = $values['opens'];
        $this->clicks = $values['clicks'];
    }

    /**
     * @return string
     */
    public function __toString(): string
    {
        return $this->toJson();
    }
}
