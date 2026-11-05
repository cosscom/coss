<?php

namespace Coss\Types;

use Coss\Core\Json\JsonSerializableType;
use Coss\Core\Json\JsonProperty;
use Coss\Core\Types\ArrayType;

class SchedulingOauthApp extends JsonSerializableType
{
    /**
     * @var value-of<SchedulingOauthAppObject> $object
     */
    #[JsonProperty('object')]
    public string $object;

    /**
     * @var string $id
     */
    #[JsonProperty('id')]
    public string $id;

    /**
     * @var value-of<SchedulingOauthAppProvider> $provider
     */
    #[JsonProperty('provider')]
    public string $provider;

    /**
     * @var string $clientId
     */
    #[JsonProperty('client_id')]
    public string $clientId;

    /**
     * @var ?string $tenantId
     */
    #[JsonProperty('tenant_id')]
    public ?string $tenantId;

    /**
     * @var ?string $redirectUri
     */
    #[JsonProperty('redirect_uri')]
    public ?string $redirectUri;

    /**
     * @var string $cossCallbackUrl Register this with the provider if `redirect_uri` isn't set. If it is, that page forwards `code` and `state` here.
     */
    #[JsonProperty('coss_callback_url')]
    public string $cossCallbackUrl;

    /**
     * @var ?string $completionUrl
     */
    #[JsonProperty('completion_url')]
    public ?string $completionUrl;

    /**
     * @var ?string $zoomEventUrl Zoom only: the Event notification endpoint URL for your app's deauthorization events.
     */
    #[JsonProperty('zoom_event_url')]
    public ?string $zoomEventUrl;

    /**
     * @var array<string> $scopes What to enable on your app at the provider.
     */
    #[JsonProperty('scopes'), ArrayType(['string'])]
    public array $scopes;

    /**
     * @var value-of<SchedulingOauthAppStatus> $status `failing`: the provider refused the app's credentials. New consents are refused, and calendars connected through it can't be read until they work again.
     */
    #[JsonProperty('status')]
    public string $status;

    /**
     * @var ?string $lastErrorCode
     */
    #[JsonProperty('last_error_code')]
    public ?string $lastErrorCode;

    /**
     * @var ?string $lastErrorAt
     */
    #[JsonProperty('last_error_at')]
    public ?string $lastErrorAt;

    /**
     * @var ?string $secretExpiresAt
     */
    #[JsonProperty('secret_expires_at')]
    public ?string $secretExpiresAt;

    /**
     * @var ?string $verifiedAt When a consent first completed through this app, which proves its secret.
     */
    #[JsonProperty('verified_at')]
    public ?string $verifiedAt;

    /**
     * @var int $connections Calendar connections using this app. It can't be deleted while there are any.
     */
    #[JsonProperty('connections')]
    public int $connections;

    /**
     * @var string $createdAt
     */
    #[JsonProperty('created_at')]
    public string $createdAt;

    /**
     * @var string $updatedAt
     */
    #[JsonProperty('updated_at')]
    public string $updatedAt;

    /**
     * @param array{
     *   object: value-of<SchedulingOauthAppObject>,
     *   id: string,
     *   provider: value-of<SchedulingOauthAppProvider>,
     *   clientId: string,
     *   cossCallbackUrl: string,
     *   scopes: array<string>,
     *   status: value-of<SchedulingOauthAppStatus>,
     *   connections: int,
     *   createdAt: string,
     *   updatedAt: string,
     *   tenantId?: ?string,
     *   redirectUri?: ?string,
     *   completionUrl?: ?string,
     *   zoomEventUrl?: ?string,
     *   lastErrorCode?: ?string,
     *   lastErrorAt?: ?string,
     *   secretExpiresAt?: ?string,
     *   verifiedAt?: ?string,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->object = $values['object'];
        $this->id = $values['id'];
        $this->provider = $values['provider'];
        $this->clientId = $values['clientId'];
        $this->tenantId = $values['tenantId'] ?? null;
        if (array_key_exists('tenantId', $values)) {
            $this->_setField('tenantId');
        }
        $this->redirectUri = $values['redirectUri'] ?? null;
        if (array_key_exists('redirectUri', $values)) {
            $this->_setField('redirectUri');
        }
        $this->cossCallbackUrl = $values['cossCallbackUrl'];
        $this->completionUrl = $values['completionUrl'] ?? null;
        if (array_key_exists('completionUrl', $values)) {
            $this->_setField('completionUrl');
        }
        $this->zoomEventUrl = $values['zoomEventUrl'] ?? null;
        if (array_key_exists('zoomEventUrl', $values)) {
            $this->_setField('zoomEventUrl');
        }
        $this->scopes = $values['scopes'];
        $this->status = $values['status'];
        $this->lastErrorCode = $values['lastErrorCode'] ?? null;
        if (array_key_exists('lastErrorCode', $values)) {
            $this->_setField('lastErrorCode');
        }
        $this->lastErrorAt = $values['lastErrorAt'] ?? null;
        if (array_key_exists('lastErrorAt', $values)) {
            $this->_setField('lastErrorAt');
        }
        $this->secretExpiresAt = $values['secretExpiresAt'] ?? null;
        if (array_key_exists('secretExpiresAt', $values)) {
            $this->_setField('secretExpiresAt');
        }
        $this->verifiedAt = $values['verifiedAt'] ?? null;
        if (array_key_exists('verifiedAt', $values)) {
            $this->_setField('verifiedAt');
        }
        $this->connections = $values['connections'];
        $this->createdAt = $values['createdAt'];
        $this->updatedAt = $values['updatedAt'];
    }

    /**
     * @return string
     */
    public function __toString(): string
    {
        return $this->toJson();
    }
}
