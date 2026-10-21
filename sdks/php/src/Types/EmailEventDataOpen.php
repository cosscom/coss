<?php

namespace Coss\Types;

use Coss\Core\Json\JsonSerializableType;
use Coss\Core\Json\JsonProperty;

/**
 * Only for `email.opened`.
 */
class EmailEventDataOpen extends JsonSerializableType
{
    /**
     * @var ?string $userAgent
     */
    #[JsonProperty('user_agent')]
    public ?string $userAgent;

    /**
     * @param array{
     *   userAgent?: ?string,
     * } $values
     */
    public function __construct(
        array $values = [],
    ) {
        $this->userAgent = $values['userAgent'] ?? null;
    }

    /**
     * @return string
     */
    public function __toString(): string
    {
        return $this->toJson();
    }
}
