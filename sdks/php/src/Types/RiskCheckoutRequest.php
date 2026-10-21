<?php

namespace Coss\Types;

use Coss\Core\Json\JsonSerializableType;
use Coss\Core\Json\JsonProperty;

/**
 * Only with `checkout` events: what is being paid for, and with which card.
 */
class RiskCheckoutRequest extends JsonSerializableType
{
    /**
     * @var int $amount The amount in the currency's minor unit (cents for USD: 1999 is $19.99).
     */
    #[JsonProperty('amount')]
    public int $amount;

    /**
     * @var string $currency ISO 4217, upper-case (`USD`).
     */
    #[JsonProperty('currency')]
    public string $currency;

    /**
     * @var ?RiskCheckoutRequestCard $card What your payment processor tells you about the card.
     */
    #[JsonProperty('card')]
    public ?RiskCheckoutRequestCard $card;

    /**
     * @var ?string $billingCountry ISO 3166-1 alpha-2, upper-case (`GB`).
     */
    #[JsonProperty('billing_country')]
    public ?string $billingCountry;

    /**
     * @var ?string $shippingCountry ISO 3166-1 alpha-2, upper-case (`GB`).
     */
    #[JsonProperty('shipping_country')]
    public ?string $shippingCountry;

    /**
     * @param array{
     *   amount: int,
     *   currency: string,
     *   card?: ?RiskCheckoutRequestCard,
     *   billingCountry?: ?string,
     *   shippingCountry?: ?string,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->amount = $values['amount'];
        $this->currency = $values['currency'];
        $this->card = $values['card'] ?? null;
        $this->billingCountry = $values['billingCountry'] ?? null;
        $this->shippingCountry = $values['shippingCountry'] ?? null;
    }

    /**
     * @return string
     */
    public function __toString(): string
    {
        return $this->toJson();
    }
}
