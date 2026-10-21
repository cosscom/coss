<?php

namespace Coss\Email\Broadcasts\Types;

use Coss\Core\Json\JsonSerializableType;
use Coss\Core\Json\JsonProperty;

class UpdateBroadcastRequestTracking extends JsonSerializableType
{
    /**
     * @var ?bool $opens
     */
    #[JsonProperty('opens')]
    public ?bool $opens;

    /**
     * @var ?bool $clicks
     */
    #[JsonProperty('clicks')]
    public ?bool $clicks;

    /**
     * @param array{
     *   opens?: ?bool,
     *   clicks?: ?bool,
     * } $values
     */
    public function __construct(
        array $values = [],
    ) {
        $this->opens = $values['opens'] ?? null;
        $this->clicks = $values['clicks'] ?? null;
    }

    /**
     * @return string
     */
    public function __toString(): string
    {
        return $this->toJson();
    }
}
