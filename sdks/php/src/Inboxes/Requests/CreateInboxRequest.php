<?php

namespace Coss\Inboxes\Requests;

use Coss\Core\Json\JsonSerializableType;
use Coss\Core\Json\JsonProperty;

class CreateInboxRequest extends JsonSerializableType
{
    /**
     * @var ?string $username The part before the @. Omit it for a random one. Mail to `username+anything@domain` reaches the inbox too.
     */
    #[JsonProperty('username')]
    public ?string $username;

    /**
     * @var ?string $domain One of the environment's receiving domains (its hostname). Omit it for the environment's own domain under coss.com's inbound domain, which needs no DNS setup.
     */
    #[JsonProperty('domain')]
    public ?string $domain;

    /**
     * @var ?string $displayName The name messages from the inbox are sent with.
     */
    #[JsonProperty('display_name')]
    public ?string $displayName;

    /**
     * @var ?string $clientId Your own id for the inbox (unique per environment). Creating an inbox with a `client_id` that already has one returns that inbox instead (200), so retries and "one inbox per user" need no bookkeeping.
     */
    #[JsonProperty('client_id')]
    public ?string $clientId;

    /**
     * @param array{
     *   username?: ?string,
     *   domain?: ?string,
     *   displayName?: ?string,
     *   clientId?: ?string,
     * } $values
     */
    public function __construct(
        array $values = [],
    ) {
        $this->username = $values['username'] ?? null;
        if (array_key_exists('username', $values)) {
            $this->_setField('username');
        }
        $this->domain = $values['domain'] ?? null;
        if (array_key_exists('domain', $values)) {
            $this->_setField('domain');
        }
        $this->displayName = $values['displayName'] ?? null;
        if (array_key_exists('displayName', $values)) {
            $this->_setField('displayName');
        }
        $this->clientId = $values['clientId'] ?? null;
        if (array_key_exists('clientId', $values)) {
            $this->_setField('clientId');
        }
    }
}
