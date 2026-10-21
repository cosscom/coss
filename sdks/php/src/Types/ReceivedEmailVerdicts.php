<?php

namespace Coss\Types;

use Coss\Core\Json\JsonSerializableType;
use Coss\Core\Json\JsonProperty;

/**
 * What the receiving server concluded: `pass`, `fail`, `gray` (could not decide) or `processing_failed`; `null` when the check did not run.
 */
class ReceivedEmailVerdicts extends JsonSerializableType
{
    /**
     * @var ?value-of<ReceivedEmailVerdictsSpam> $spam
     */
    #[JsonProperty('spam')]
    public ?string $spam;

    /**
     * @var ?value-of<ReceivedEmailVerdictsVirus> $virus
     */
    #[JsonProperty('virus')]
    public ?string $virus;

    /**
     * @var ?value-of<ReceivedEmailVerdictsSpf> $spf
     */
    #[JsonProperty('spf')]
    public ?string $spf;

    /**
     * @var ?value-of<ReceivedEmailVerdictsDkim> $dkim
     */
    #[JsonProperty('dkim')]
    public ?string $dkim;

    /**
     * @var ?value-of<ReceivedEmailVerdictsDmarc> $dmarc
     */
    #[JsonProperty('dmarc')]
    public ?string $dmarc;

    /**
     * @var ?string $dmarcPolicy The sender domain's DMARC policy (`none`, `quarantine` or `reject`) when DMARC failed.
     */
    #[JsonProperty('dmarc_policy')]
    public ?string $dmarcPolicy;

    /**
     * @param array{
     *   spam?: ?value-of<ReceivedEmailVerdictsSpam>,
     *   virus?: ?value-of<ReceivedEmailVerdictsVirus>,
     *   spf?: ?value-of<ReceivedEmailVerdictsSpf>,
     *   dkim?: ?value-of<ReceivedEmailVerdictsDkim>,
     *   dmarc?: ?value-of<ReceivedEmailVerdictsDmarc>,
     *   dmarcPolicy?: ?string,
     * } $values
     */
    public function __construct(
        array $values = [],
    ) {
        $this->spam = $values['spam'] ?? null;
        $this->virus = $values['virus'] ?? null;
        $this->spf = $values['spf'] ?? null;
        $this->dkim = $values['dkim'] ?? null;
        $this->dmarc = $values['dmarc'] ?? null;
        $this->dmarcPolicy = $values['dmarcPolicy'] ?? null;
    }

    /**
     * @return string
     */
    public function __toString(): string
    {
        return $this->toJson();
    }
}
