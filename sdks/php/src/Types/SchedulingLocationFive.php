<?php

namespace Coss\Types;

use Coss\Core\Json\JsonSerializableType;
use Coss\Core\Json\JsonProperty;

class SchedulingLocationFive extends JsonSerializableType
{
    /**
     * @var value-of<SchedulingLocationFiveType> $type
     */
    #[JsonProperty('type')]
    public string $type;

    /**
     * @var ?string $url The meeting's link, once it's created on the host's Zoom account.
     */
    #[JsonProperty('url')]
    public ?string $url;

    /**
     * @param array{
     *   type: value-of<SchedulingLocationFiveType>,
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
