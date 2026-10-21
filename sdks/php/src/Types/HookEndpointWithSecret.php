<?php

namespace Coss\Types;

use Coss\Core\Json\JsonSerializableType;
use Coss\Core\Json\JsonProperty;
use Coss\Core\Types\ArrayType;
use DateTime;
use Coss\Core\Types\Date;

class HookEndpointWithSecret extends JsonSerializableType
{
    /**
     * @var value-of<HookEndpointWithSecretObject> $object
     */
    #[JsonProperty('object')]
    public string $object;

    /**
     * @var string $id
     */
    #[JsonProperty('id')]
    public string $id;

    /**
     * @var string $applicationId
     */
    #[JsonProperty('application_id')]
    public string $applicationId;

    /**
     * @var string $url
     */
    #[JsonProperty('url')]
    public string $url;

    /**
     * @var ?string $description
     */
    #[JsonProperty('description')]
    public ?string $description;

    /**
     * @var array<string> $filterTypes
     */
    #[JsonProperty('filter_types'), ArrayType(['string'])]
    public array $filterTypes;

    /**
     * @var ?int $rateLimitPerSecond
     */
    #[JsonProperty('rate_limit_per_second')]
    public ?int $rateLimitPerSecond;

    /**
     * @var bool $enabled
     */
    #[JsonProperty('enabled')]
    public bool $enabled;

    /**
     * @var ?value-of<HookEndpointWithSecretDisabledReason> $disabledReason `manual`: disabled by you or its user. `failing`: its deliveries failed every attempt for five days, so coss.com disabled it. `null` while enabled.
     */
    #[JsonProperty('disabled_reason')]
    public ?string $disabledReason;

    /**
     * @var ?DateTime $disabledAt
     */
    #[JsonProperty('disabled_at'), Date(Date::TYPE_DATETIME)]
    public ?DateTime $disabledAt;

    /**
     * @var ?DateTime $failingSince When its current run of failed deliveries began; cleared by the next success. `null` while healthy.
     */
    #[JsonProperty('failing_since'), Date(Date::TYPE_DATETIME)]
    public ?DateTime $failingSince;

    /**
     * @var ?DateTime $previousSecretExpiresAt After a secret roll, requests are also signed with the previous secret until then.
     */
    #[JsonProperty('previous_secret_expires_at'), Date(Date::TYPE_DATETIME)]
    public ?DateTime $previousSecretExpiresAt;

    /**
     * @var array<string, string> $metadata
     */
    #[JsonProperty('metadata'), ArrayType(['string' => 'string'])]
    public array $metadata;

    /**
     * @var DateTime $createdAt
     */
    #[JsonProperty('created_at'), Date(Date::TYPE_DATETIME)]
    public DateTime $createdAt;

    /**
     * @var DateTime $updatedAt
     */
    #[JsonProperty('updated_at'), Date(Date::TYPE_DATETIME)]
    public DateTime $updatedAt;

    /**
     * @var string $secret The endpoint's `whsec_…` signing secret (Standard Webhooks).
     */
    #[JsonProperty('secret')]
    public string $secret;

    /**
     * @param array{
     *   object: value-of<HookEndpointWithSecretObject>,
     *   id: string,
     *   applicationId: string,
     *   url: string,
     *   filterTypes: array<string>,
     *   enabled: bool,
     *   metadata: array<string, string>,
     *   createdAt: DateTime,
     *   updatedAt: DateTime,
     *   secret: string,
     *   description?: ?string,
     *   rateLimitPerSecond?: ?int,
     *   disabledReason?: ?value-of<HookEndpointWithSecretDisabledReason>,
     *   disabledAt?: ?DateTime,
     *   failingSince?: ?DateTime,
     *   previousSecretExpiresAt?: ?DateTime,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->object = $values['object'];
        $this->id = $values['id'];
        $this->applicationId = $values['applicationId'];
        $this->url = $values['url'];
        $this->description = $values['description'] ?? null;
        $this->filterTypes = $values['filterTypes'];
        $this->rateLimitPerSecond = $values['rateLimitPerSecond'] ?? null;
        $this->enabled = $values['enabled'];
        $this->disabledReason = $values['disabledReason'] ?? null;
        $this->disabledAt = $values['disabledAt'] ?? null;
        $this->failingSince = $values['failingSince'] ?? null;
        $this->previousSecretExpiresAt = $values['previousSecretExpiresAt'] ?? null;
        $this->metadata = $values['metadata'];
        $this->createdAt = $values['createdAt'];
        $this->updatedAt = $values['updatedAt'];
        $this->secret = $values['secret'];
    }

    /**
     * @return string
     */
    public function __toString(): string
    {
        return $this->toJson();
    }
}
