<?php

namespace Coss\Hooks\Endpoints\Requests;

use Coss\Core\Json\JsonSerializableType;
use Coss\Core\Json\JsonProperty;

class RollHookEndpointSecretRequest extends JsonSerializableType
{
    /**
     * @var ?int $previousSecretExpiresIn Seconds the current secret keeps signing next to the new one. Default 86400 (a day), at most 604800 (a week); `0` stops it immediately.
     */
    #[JsonProperty('previous_secret_expires_in')]
    public ?int $previousSecretExpiresIn;

    /**
     * @param array{
     *   previousSecretExpiresIn?: ?int,
     * } $values
     */
    public function __construct(
        array $values = [],
    ) {
        $this->previousSecretExpiresIn = $values['previousSecretExpiresIn'] ?? null;
        if (array_key_exists('previousSecretExpiresIn', $values)) {
            $this->_setField('previousSecretExpiresIn');
        }
    }
}
