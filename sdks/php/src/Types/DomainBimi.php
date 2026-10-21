<?php

namespace Coss\Types;

use Coss\Core\Json\JsonSerializableType;
use Coss\Core\Json\JsonProperty;
use Coss\Core\Types\ArrayType;

/**
 * The result of the last BIMI check: whether mailbox providers can find the domain's brand logo and certificate. The record and the certificate are your own.
 */
class DomainBimi extends JsonSerializableType
{
    /**
     * @var value-of<DomainBimiStatus> $status `configured` when the BIMI record is valid and DMARC is enforced, `invalid` when a record exists but something is wrong (see `issues`), `missing` when there is no record, and `not_checked` until DNS has been consulted. coss.com checks DNS only: mailbox providers still validate the logo and the certificate.
     */
    #[JsonProperty('status')]
    public string $status;

    /**
     * @var string $name Where the BIMI record was found, or looked up when there is none: `default._bimi.<domain>`, or the organizational domain's when only it has one.
     */
    #[JsonProperty('name')]
    public string $name;

    /**
     * @var ?string $record The `v=BIMI1` record found.
     */
    #[JsonProperty('record')]
    public ?string $record;

    /**
     * @var ?string $logoUrl The record's logo URL (`l=`).
     */
    #[JsonProperty('logo_url')]
    public ?string $logoUrl;

    /**
     * @var ?string $certificateUrl The record's VMC or CMC certificate URL (`a=`).
     */
    #[JsonProperty('certificate_url')]
    public ?string $certificateUrl;

    /**
     * @var ?value-of<DomainBimiDmarcPolicy> $dmarcPolicy The DMARC policy that applies to the domain (the organizational domain's `sp` when it has no record of its own), `null` without a DMARC record.
     */
    #[JsonProperty('dmarc_policy')]
    public ?string $dmarcPolicy;

    /**
     * @var array<DomainBimiIssuesItem> $issues What keeps the domain's logo from showing, as far as DNS tells.
     */
    #[JsonProperty('issues'), ArrayType([DomainBimiIssuesItem::class])]
    public array $issues;

    /**
     * @param array{
     *   status: value-of<DomainBimiStatus>,
     *   name: string,
     *   issues: array<DomainBimiIssuesItem>,
     *   record?: ?string,
     *   logoUrl?: ?string,
     *   certificateUrl?: ?string,
     *   dmarcPolicy?: ?value-of<DomainBimiDmarcPolicy>,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->status = $values['status'];
        $this->name = $values['name'];
        $this->record = $values['record'] ?? null;
        $this->logoUrl = $values['logoUrl'] ?? null;
        $this->certificateUrl = $values['certificateUrl'] ?? null;
        $this->dmarcPolicy = $values['dmarcPolicy'] ?? null;
        $this->issues = $values['issues'];
    }

    /**
     * @return string
     */
    public function __toString(): string
    {
        return $this->toJson();
    }
}
