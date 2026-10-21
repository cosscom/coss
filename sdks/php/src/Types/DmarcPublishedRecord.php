<?php

namespace Coss\Types;

use Coss\Core\Json\JsonSerializableType;
use Coss\Core\Json\JsonProperty;
use Coss\Core\Types\ArrayType;

/**
 * The DMARC record found at `_dmarc.<domain>` by the latest DNS check.
 */
class DmarcPublishedRecord extends JsonSerializableType
{
    /**
     * @var string $value The `v=DMARC1` TXT record as published.
     */
    #[JsonProperty('value')]
    public string $value;

    /**
     * @var ?value-of<DmarcPublishedRecordP> $p
     */
    #[JsonProperty('p')]
    public ?string $p;

    /**
     * @var ?value-of<DmarcPublishedRecordSp> $sp
     */
    #[JsonProperty('sp')]
    public ?string $sp;

    /**
     * @var ?value-of<DmarcPublishedRecordNp> $np
     */
    #[JsonProperty('np')]
    public ?string $np;

    /**
     * @var ?value-of<DmarcPublishedRecordAdkim> $adkim
     */
    #[JsonProperty('adkim')]
    public ?string $adkim;

    /**
     * @var ?value-of<DmarcPublishedRecordAspf> $aspf
     */
    #[JsonProperty('aspf')]
    public ?string $aspf;

    /**
     * @var ?int $pct Removed by RFC 9989 but still honored by many receivers.
     */
    #[JsonProperty('pct')]
    public ?int $pct;

    /**
     * @var ?value-of<DmarcPublishedRecordT> $t
     */
    #[JsonProperty('t')]
    public ?string $t;

    /**
     * @var array<string> $rua Aggregate report addresses.
     */
    #[JsonProperty('rua'), ArrayType(['string'])]
    public array $rua;

    /**
     * @param array{
     *   value: string,
     *   rua: array<string>,
     *   p?: ?value-of<DmarcPublishedRecordP>,
     *   sp?: ?value-of<DmarcPublishedRecordSp>,
     *   np?: ?value-of<DmarcPublishedRecordNp>,
     *   adkim?: ?value-of<DmarcPublishedRecordAdkim>,
     *   aspf?: ?value-of<DmarcPublishedRecordAspf>,
     *   pct?: ?int,
     *   t?: ?value-of<DmarcPublishedRecordT>,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->value = $values['value'];
        $this->p = $values['p'] ?? null;
        $this->sp = $values['sp'] ?? null;
        $this->np = $values['np'] ?? null;
        $this->adkim = $values['adkim'] ?? null;
        $this->aspf = $values['aspf'] ?? null;
        $this->pct = $values['pct'] ?? null;
        $this->t = $values['t'] ?? null;
        $this->rua = $values['rua'];
    }

    /**
     * @return string
     */
    public function __toString(): string
    {
        return $this->toJson();
    }
}
