<?php

namespace Coss\Types;

use Coss\Core\Json\JsonSerializableType;
use Coss\Core\Json\JsonProperty;

/**
 * Logins of a user with history: whether the country or network is new for them.
 */
class RiskLoginSignals extends JsonSerializableType
{
    /**
     * @var bool $newCountry
     */
    #[JsonProperty('new_country')]
    public bool $newCountry;

    /**
     * @var bool $newNetwork
     */
    #[JsonProperty('new_network')]
    public bool $newNetwork;

    /**
     * @param array{
     *   newCountry: bool,
     *   newNetwork: bool,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->newCountry = $values['newCountry'];
        $this->newNetwork = $values['newNetwork'];
    }

    /**
     * @return string
     */
    public function __toString(): string
    {
        return $this->toJson();
    }
}
