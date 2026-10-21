<?php

namespace Coss\Types;

use Coss\Core\Json\JsonSerializableType;
use Coss\Core\Json\JsonProperty;

/**
 * Resource limits (`null`: unlimited).
 */
class BillingLimits extends JsonSerializableType
{
    /**
     * @var ?int $domains
     */
    #[JsonProperty('domains')]
    public ?int $domains;

    /**
     * @var ?int $members
     */
    #[JsonProperty('members')]
    public ?int $members;

    /**
     * @var ?int $webhookEndpointsPerEnvironment
     */
    #[JsonProperty('webhook_endpoints_per_environment')]
    public ?int $webhookEndpointsPerEnvironment;

    /**
     * @var ?int $contactsPerEnvironment
     */
    #[JsonProperty('contacts_per_environment')]
    public ?int $contactsPerEnvironment;

    /**
     * @param array{
     *   domains?: ?int,
     *   members?: ?int,
     *   webhookEndpointsPerEnvironment?: ?int,
     *   contactsPerEnvironment?: ?int,
     * } $values
     */
    public function __construct(
        array $values = [],
    ) {
        $this->domains = $values['domains'] ?? null;
        if (array_key_exists('domains', $values)) {
            $this->_setField('domains');
        }
        $this->members = $values['members'] ?? null;
        if (array_key_exists('members', $values)) {
            $this->_setField('members');
        }
        $this->webhookEndpointsPerEnvironment = $values['webhookEndpointsPerEnvironment'] ?? null;
        if (array_key_exists('webhookEndpointsPerEnvironment', $values)) {
            $this->_setField('webhookEndpointsPerEnvironment');
        }
        $this->contactsPerEnvironment = $values['contactsPerEnvironment'] ?? null;
        if (array_key_exists('contactsPerEnvironment', $values)) {
            $this->_setField('contactsPerEnvironment');
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
