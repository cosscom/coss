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
        $this->members = $values['members'] ?? null;
        $this->webhookEndpointsPerEnvironment = $values['webhookEndpointsPerEnvironment'] ?? null;
        $this->contactsPerEnvironment = $values['contactsPerEnvironment'] ?? null;
    }

    /**
     * @return string
     */
    public function __toString(): string
    {
        return $this->toJson();
    }
}
