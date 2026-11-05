<?php

namespace Coss\Types;

use Coss\Core\Json\JsonSerializableType;
use Coss\Core\Json\JsonProperty;

class SchedulingLocationZero extends JsonSerializableType
{
    /**
     * @var value-of<SchedulingLocationZeroType> $type
     */
    #[JsonProperty('type')]
    public string $type;

    /**
     * @var ?string $url The meeting link. `null` on an event type means the booking supplies its own.
     */
    #[JsonProperty('url')]
    public ?string $url;

    /**
     * @param array{
     *   type: value-of<SchedulingLocationZeroType>,
     *   url?: ?string,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->type = $values['type'];
        $this->url = $values['url'] ?? null;
        if (array_key_exists('url', $values)) {
            $this->_setField('url');
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
