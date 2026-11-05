<?php

namespace Coss\Types;

use Coss\Core\Json\JsonSerializableType;
use Coss\Core\Json\JsonProperty;
use DateTime;
use Coss\Core\Types\Date;

class CreateOauthAppRequestGoogle extends JsonSerializableType
{
    /**
     * @var string $clientId The app's client ID at the provider.
     */
    #[JsonProperty('client_id')]
    public string $clientId;

    /**
     * @var string $clientSecret The app's client secret. Never returned.
     */
    #[JsonProperty('client_secret')]
    public string $clientSecret;

    /**
     * @var ?string $redirectUri A page on your own domain, registered with the provider, that forwards `code` and `state` to `coss_callback_url`. Google requires this for an external app, since it has to verify the redirect's domain as yours. Leave it out to use `coss_callback_url` directly.
     */
    #[JsonProperty('redirect_uri')]
    public ?string $redirectUri;

    /**
     * @var ?string $completionUrl Where the browser lands after a consent that didn't name a `return_url`, with `coss_calendar` set to `connected`, `denied` or `invalid`. Leave it out for a plain page saying what happened.
     */
    #[JsonProperty('completion_url')]
    public ?string $completionUrl;

    /**
     * @var ?DateTime $secretExpiresAt When the client secret expires. Owners and admins are warned 14 days before.
     */
    #[JsonProperty('secret_expires_at'), Date(Date::TYPE_DATETIME)]
    public ?DateTime $secretExpiresAt;

    /**
     * @param array{
     *   clientId: string,
     *   clientSecret: string,
     *   redirectUri?: ?string,
     *   completionUrl?: ?string,
     *   secretExpiresAt?: ?DateTime,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->clientId = $values['clientId'];
        $this->clientSecret = $values['clientSecret'];
        $this->redirectUri = $values['redirectUri'] ?? null;
        if (array_key_exists('redirectUri', $values)) {
            $this->_setField('redirectUri');
        }
        $this->completionUrl = $values['completionUrl'] ?? null;
        if (array_key_exists('completionUrl', $values)) {
            $this->_setField('completionUrl');
        }
        $this->secretExpiresAt = $values['secretExpiresAt'] ?? null;
        if (array_key_exists('secretExpiresAt', $values)) {
            $this->_setField('secretExpiresAt');
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
