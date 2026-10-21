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
        if (array_key_exists('opens', $values)) {
            $this->_setField('opens');
        }
        $this->clicks = $values['clicks'] ?? null;
        if (array_key_exists('clicks', $values)) {
            $this->_setField('clicks');
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
