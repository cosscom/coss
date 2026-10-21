<?php

namespace Coss\Types;

use Coss\Core\Json\JsonSerializableType;
use Coss\Core\Json\JsonProperty;

/**
 * What you sent in `checkout` (never the card).
 */
class RiskCheckoutSignals extends JsonSerializableType
{
    /**
     * @var int $amount
     */
    #[JsonProperty('amount')]
    public int $amount;

    /**
     * @var string $currency
     */
    #[JsonProperty('currency')]
    public string $currency;

    /**
     * @var ?string $cardCountry
     */
    #[JsonProperty('card_country')]
    public ?string $cardCountry;

    /**
     * @var ?value-of<RiskCheckoutSignalsCardFunding> $cardFunding
     */
    #[JsonProperty('card_funding')]
    public ?string $cardFunding;

    /**
     * @var ?string $billingCountry
     */
    #[JsonProperty('billing_country')]
    public ?string $billingCountry;

    /**
     * @var ?string $shippingCountry
     */
    #[JsonProperty('shipping_country')]
    public ?string $shippingCountry;

    /**
     * @param array{
     *   amount: int,
     *   currency: string,
     *   cardCountry?: ?string,
     *   cardFunding?: ?value-of<RiskCheckoutSignalsCardFunding>,
     *   billingCountry?: ?string,
     *   shippingCountry?: ?string,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->amount = $values['amount'];
        $this->currency = $values['currency'];
        $this->cardCountry = $values['cardCountry'] ?? null;
        if (array_key_exists('cardCountry', $values)) {
            $this->_setField('cardCountry');
        }
        $this->cardFunding = $values['cardFunding'] ?? null;
        if (array_key_exists('cardFunding', $values)) {
            $this->_setField('cardFunding');
        }
        $this->billingCountry = $values['billingCountry'] ?? null;
        if (array_key_exists('billingCountry', $values)) {
            $this->_setField('billingCountry');
        }
        $this->shippingCountry = $values['shippingCountry'] ?? null;
        if (array_key_exists('shippingCountry', $values)) {
            $this->_setField('shippingCountry');
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
