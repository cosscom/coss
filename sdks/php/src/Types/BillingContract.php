<?php

namespace Coss\Types;

use Coss\Core\Json\JsonSerializableType;
use Coss\Core\Json\JsonProperty;
use DateTime;
use Coss\Core\Types\Date;

/**
 * The contract in effect; `null` on the Free plan.
 */
class BillingContract extends JsonSerializableType
{
    /**
     * @var string $id
     */
    #[JsonProperty('id')]
    public string $id;

    /**
     * @var value-of<BillingContractKind> $kind
     */
    #[JsonProperty('kind')]
    public string $kind;

    /**
     * @var DateTime $effectiveFrom
     */
    #[JsonProperty('effective_from'), Date(Date::TYPE_DATETIME)]
    public DateTime $effectiveFrom;

    /**
     * @var ?DateTime $effectiveUntil
     */
    #[JsonProperty('effective_until'), Date(Date::TYPE_DATETIME)]
    public ?DateTime $effectiveUntil;

    /**
     * @var ?DateTime $termEnd End of a committed term.
     */
    #[JsonProperty('term_end'), Date(Date::TYPE_DATETIME)]
    public ?DateTime $termEnd;

    /**
     * @var bool $autoRenew
     */
    #[JsonProperty('auto_renew')]
    public bool $autoRenew;

    /**
     * @param array{
     *   id: string,
     *   kind: value-of<BillingContractKind>,
     *   effectiveFrom: DateTime,
     *   autoRenew: bool,
     *   effectiveUntil?: ?DateTime,
     *   termEnd?: ?DateTime,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->id = $values['id'];
        $this->kind = $values['kind'];
        $this->effectiveFrom = $values['effectiveFrom'];
        $this->effectiveUntil = $values['effectiveUntil'] ?? null;
        $this->termEnd = $values['termEnd'] ?? null;
        $this->autoRenew = $values['autoRenew'];
    }

    /**
     * @return string
     */
    public function __toString(): string
    {
        return $this->toJson();
    }
}
