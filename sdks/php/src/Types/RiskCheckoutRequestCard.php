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
        if (array_key_exists('fingerprint', $values)) {
            $this->_setField('fingerprint');
        }
        $this->country = $values['country'] ?? null;
        if (array_key_exists('country', $values)) {
            $this->_setField('country');
        }
        $this->funding = $values['funding'] ?? null;
        if (array_key_exists('funding', $values)) {
            $this->_setField('funding');
        }
    }

    /**
     * @return string
     */
    public function __toString(): string
    {
        return $this->toJson();
    }
}
