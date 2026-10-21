<?php

namespace Coss\Types;

use Coss\Core\Json\JsonSerializableType;
use Coss\Core\Json\JsonProperty;
use Coss\Core\Types\ArrayType;
use DateTime;
use Coss\Core\Types\Date;

/**
 * Your organization's dedicated IPs (the Dedicated IPs add-on): a pool managed and warmed up automatically.
 */
class DedicatedIpPool extends JsonSerializableType
{
    /**
     * @var value-of<DedicatedIpPoolObject> $object
     */
    #[JsonProperty('object')]
    public string $object;

    /**
     * @var value-of<DedicatedIpPoolStatus> $status `not_enabled` without the Dedicated IPs add-on. `provisioning` while the pool is set up (`waiting` when none is free yet), then `warming`: live emails go through the pool while it warms up its IPs, sending what they can't take yet from shared IPs. `ready` once at least 95% of the last 7 days' deliveries (at least 1,000) left from your dedicated IPs. `releasing` after the add-on ends: emails are back on shared IPs, and the pool is released a day later.
     */
    #[JsonProperty('status')]
    public string $status;

    /**
     * @var array<DedicatedIpPoolIpsItem> $ips The pool's IPs; the provider adds and removes them with volume.
     */
    #[JsonProperty('ips'), ArrayType([DedicatedIpPoolIpsItem::class])]
    public array $ips;

    /**
     * @var ?float $dedicatedShare Share (0–1) of the last 7 days' deliveries that left from the pool's IPs (`null`: fewer than 1,000).
     */
    #[JsonProperty('dedicated_share')]
    public ?float $dedicatedShare;

    /**
     * @var ?string $message What is holding the pool up, if anything.
     */
    #[JsonProperty('message')]
    public ?string $message;

    /**
     * @var ?DateTime $createdAt
     */
    #[JsonProperty('created_at'), Date(Date::TYPE_DATETIME)]
    public ?DateTime $createdAt;

    /**
     * @var ?DateTime $readyAt When it was first `ready`.
     */
    #[JsonProperty('ready_at'), Date(Date::TYPE_DATETIME)]
    public ?DateTime $readyAt;

    /**
     * @param array{
     *   object: value-of<DedicatedIpPoolObject>,
     *   status: value-of<DedicatedIpPoolStatus>,
     *   ips: array<DedicatedIpPoolIpsItem>,
     *   dedicatedShare?: ?float,
     *   message?: ?string,
     *   createdAt?: ?DateTime,
     *   readyAt?: ?DateTime,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->object = $values['object'];
        $this->status = $values['status'];
        $this->ips = $values['ips'];
        $this->dedicatedShare = $values['dedicatedShare'] ?? null;
        $this->message = $values['message'] ?? null;
        $this->createdAt = $values['createdAt'] ?? null;
        $this->readyAt = $values['readyAt'] ?? null;
    }

    /**
     * @return string
     */
    public function __toString(): string
    {
        return $this->toJson();
    }
}
