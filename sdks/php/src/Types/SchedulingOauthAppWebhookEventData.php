<?php

namespace Coss\Types;

use Coss\Core\Json\JsonSerializableType;
use Coss\Core\Json\JsonProperty;

class SchedulingOauthAppWebhookEventData extends JsonSerializableType
{
    /**
     * @var string $oauthAppId
     */
    #[JsonProperty('oauth_app_id')]
    public string $oauthAppId;

    /**
     * @var string $provider
     */
    #[JsonProperty('provider')]
    public string $provider;

    /**
     * @var ?string $code What the provider said, when it refused.
     */
    #[JsonProperty('code')]
    public ?string $code;

    /**
     * @var string $occurredAt
     */
    #[JsonProperty('occurred_at')]
    public string $occurredAt;

    /**
     * @param array{
     *   oauthAppId: string,
     *   provider: string,
     *   occurredAt: string,
     *   code?: ?string,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->oauthAppId = $values['oauthAppId'];
        $this->provider = $values['provider'];
        $this->code = $values['code'] ?? null;
        if (array_key_exists('code', $values)) {
            $this->_setField('code');
        }
        $this->occurredAt = $values['occurredAt'];
    }

    /**
     * @return string
     */
    public function __toString(): string
    {
        return $this->toJson();
    }
}
