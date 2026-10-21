<?php

namespace Coss\Types;

use Coss\Core\Json\JsonSerializableType;
use Coss\Core\Json\JsonProperty;

/**
 * What your payment processor tells you about the card.
 */
class RiskCheckoutRequestCard extends JsonSerializableType
{
    /**
     * @var ?string $fingerprint Your payment processor's fingerprint of the card number (Stripe: `card.fingerprint`). Counted and remembered as a keyed hash only; never send the card number.
     */
    #[JsonProperty('fingerprint')]
    public ?string $fingerprint;

    /**
     * @var ?string $country Where the card was issued.
     */
    #[JsonProperty('country')]
    public ?string $country;

    /**
     * @var ?value-of<RiskCheckoutRequestCardFunding> $funding
     */
    #[JsonProperty('funding')]
    public ?string $funding;

    /**
     * @param array{
     *   fingerprint?: ?string,
     *   country?: ?string,
     *   funding?: ?value-of<RiskCheckoutRequestCardFunding>,
     * } $values
     */
    public function __construct(
        array $values = [],
    ) {
        $this->fingerprint = $values['fingerprint'] ?? null;
        $this->country = $values['country'] ?? null;
        $this->funding = $values['funding'] ?? null;
    }

    /**
     * @return string
     */
    public function __toString(): string
    {
        return $this->toJson();
    }
}
