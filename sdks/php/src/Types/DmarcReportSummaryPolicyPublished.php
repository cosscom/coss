<?php

namespace Coss\Types;

use Coss\Core\Json\JsonSerializableType;
use Coss\Core\Json\JsonProperty;

/**
 * The policy the reporter found when it evaluated the mail.
 */
class DmarcReportSummaryPolicyPublished extends JsonSerializableType
{
    /**
     * @var string $domain
     */
    #[JsonProperty('domain')]
    public string $domain;

    /**
     * @var ?string $p
     */
    #[JsonProperty('p')]
    public ?string $p;

    /**
     * @var ?string $sp
     */
    #[JsonProperty('sp')]
    public ?string $sp;

    /**
     * @var ?string $np
     */
    #[JsonProperty('np')]
    public ?string $np;

    /**
     * @var ?string $adkim
     */
    #[JsonProperty('adkim')]
    public ?string $adkim;

    /**
     * @var ?string $aspf
     */
    #[JsonProperty('aspf')]
    public ?string $aspf;

    /**
     * @var ?int $pct
     */
    #[JsonProperty('pct')]
    public ?int $pct;

    /**
     * @var ?string $testing
     */
    #[JsonProperty('testing')]
    public ?string $testing;

    /**
     * @param array{
     *   domain: string,
     *   p?: ?string,
     *   sp?: ?string,
     *   np?: ?string,
     *   adkim?: ?string,
     *   aspf?: ?string,
     *   pct?: ?int,
     *   testing?: ?string,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->domain = $values['domain'];
        $this->p = $values['p'] ?? null;
        $this->sp = $values['sp'] ?? null;
        $this->np = $values['np'] ?? null;
        $this->adkim = $values['adkim'] ?? null;
        $this->aspf = $values['aspf'] ?? null;
        $this->pct = $values['pct'] ?? null;
        $this->testing = $values['testing'] ?? null;
    }

    /**
     * @return string
     */
    public function __toString(): string
    {
        return $this->toJson();
    }
}
