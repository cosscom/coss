<?php

namespace Coss\Types;

use Coss\Core\Json\JsonSerializableType;
use Coss\Core\Json\JsonProperty;
use Coss\Core\Types\ArrayType;

class RiskPhoneCheck extends JsonSerializableType
{
    /**
     * @var value-of<RiskPhoneCheckObject> $object
     */
    #[JsonProperty('object')]
    public string $object;

    /**
     * @var string $phone The number in E.164, or as given when it isn't.
     */
    #[JsonProperty('phone')]
    public string $phone;

    /**
     * @var bool $valid A possible number in its country's numbering plan. When the lookup failed (`degraded`), only the E.164 syntax was checked.
     */
    #[JsonProperty('valid')]
    public bool $valid;

    /**
     * @var ?string $country ISO 3166-1 alpha-2.
     */
    #[JsonProperty('country')]
    public ?string $country;

    /**
     * @var ?value-of<RiskPhoneCheckLineType> $lineType `fixed_voip` numbers belong to an address (cable, business lines); `non_fixed_voip` ones can be had online in minutes (Google Voice, app numbers), the kind used for throwaway accounts. `null` when it couldn't be looked up.
     */
    #[JsonProperty('line_type')]
    public ?string $lineType;

    /**
     * @var ?RiskPhoneCarrier $carrier The network the number is on now (after any port). `null` when unknown, and for toll-free, premium and personal numbers.
     */
    #[JsonProperty('carrier')]
    public ?RiskPhoneCarrier $carrier;

    /**
     * @var ?RiskPhoneSimSwap $simSwap The mobile number's last SIM change. `null` where coss.com doesn't have that data (not every country and carrier).
     */
    #[JsonProperty('sim_swap')]
    public ?RiskPhoneSimSwap $simSwap;

    /**
     * @var array<value-of<RiskPhoneCheckDegradedItem>> $degraded `phone_data` when the lookup failed or timed out (or had no line type for the number); `sim_swap` when the carrier didn't answer about the SIM.
     */
    #[JsonProperty('degraded'), ArrayType(['string'])]
    public array $degraded;

    /**
     * @param array{
     *   object: value-of<RiskPhoneCheckObject>,
     *   phone: string,
     *   valid: bool,
     *   degraded: array<value-of<RiskPhoneCheckDegradedItem>>,
     *   country?: ?string,
     *   lineType?: ?value-of<RiskPhoneCheckLineType>,
     *   carrier?: ?RiskPhoneCarrier,
     *   simSwap?: ?RiskPhoneSimSwap,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->object = $values['object'];
        $this->phone = $values['phone'];
        $this->valid = $values['valid'];
        $this->country = $values['country'] ?? null;
        if (array_key_exists('country', $values)) {
            $this->_setField('country');
        }
        $this->lineType = $values['lineType'] ?? null;
        if (array_key_exists('lineType', $values)) {
            $this->_setField('lineType');
        }
        $this->carrier = $values['carrier'] ?? null;
        if (array_key_exists('carrier', $values)) {
            $this->_setField('carrier');
        }
        $this->simSwap = $values['simSwap'] ?? null;
        if (array_key_exists('simSwap', $values)) {
            $this->_setField('simSwap');
        }
        $this->degraded = $values['degraded'];
    }

    /**
     * @return string
     */
    public function __toString(): string
    {
        return $this->toJson();
    }
}
