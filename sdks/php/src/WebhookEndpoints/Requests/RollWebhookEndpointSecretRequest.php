<?php

namespace Coss\WebhookEndpoints\Requests;

use Coss\Core\Json\JsonSerializableType;
use Coss\Core\Json\JsonProperty;

class RollWebhookEndpointSecretRequest extends JsonSerializableType
{
    /**
     * @var ?int $previousSecretExpiresIn Seconds the current secret keeps signing deliveries next to the new one, so receivers can switch without rejecting anything. Default 86400 (a day), at most 604800 (a week). `0` stops it immediately, e.g. after a leak.
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
