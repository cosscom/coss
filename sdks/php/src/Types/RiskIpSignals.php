<?php

namespace Coss\Types;

use Coss\Core\Json\JsonSerializableType;
use Coss\Core\Json\JsonProperty;

class RiskIpSignals extends JsonSerializableType
{
    /**
     * @var float $version
     */
    #[JsonProperty('version')]
    public float $version;

    /**
     * @var bool $private
     */
    #[JsonProperty('private')]
    public bool $private;

    /**
     * @var bool $tor
     */
    #[JsonProperty('tor')]
    public bool $tor;

    /**
     * @var bool $hosting
     */
    #[JsonProperty('hosting')]
    public bool $hosting;

    /**
     * @var ?string $hostingProvider
     */
    #[JsonProperty('hosting_provider')]
    public ?string $hostingProvider;

    /**
     * @var ?value-of<RiskIpSignalsHostingKind> $hostingKind
     */
    #[JsonProperty('hosting_kind')]
    public ?string $hostingKind;

    /**
     * @var ?int $asn
     */
    #[JsonProperty('asn')]
    public ?int $asn;

    /**
     * @var ?string $asName
     */
    #[JsonProperty('as_name')]
    public ?string $asName;

    /**
     * @var ?string $country ISO 3166-1 alpha-2.
     */
    #[JsonProperty('country')]
    public ?string $country;

    /**
     * @var ?RiskIpPrivacy $privacy From coss.com's IP privacy data provider (VPNs, proxies, relays). `null` when it isn't available or was not asked (private addresses).
     */
    #[JsonProperty('privacy')]
    public ?RiskIpPrivacy $privacy;

    /**
     * @param array{
     *   version: float,
     *   private: bool,
     *   tor: bool,
     *   hosting: bool,
     *   hostingProvider?: ?string,
     *   hostingKind?: ?value-of<RiskIpSignalsHostingKind>,
     *   asn?: ?int,
     *   asName?: ?string,
     *   country?: ?string,
     *   privacy?: ?RiskIpPrivacy,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->version = $values['version'];
        $this->private = $values['private'];
        $this->tor = $values['tor'];
        $this->hosting = $values['hosting'];
        $this->hostingProvider = $values['hostingProvider'] ?? null;
        $this->hostingKind = $values['hostingKind'] ?? null;
        $this->asn = $values['asn'] ?? null;
        $this->asName = $values['asName'] ?? null;
        $this->country = $values['country'] ?? null;
        $this->privacy = $values['privacy'] ?? null;
    }

    /**
     * @return string
     */
    public function __toString(): string
    {
        return $this->toJson();
    }
}
