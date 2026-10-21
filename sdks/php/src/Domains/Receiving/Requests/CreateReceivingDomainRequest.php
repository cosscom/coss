<?php

namespace Coss\Domains\Receiving\Requests;

use Coss\Core\Json\JsonSerializableType;
use Coss\Core\Json\JsonProperty;

class CreateReceivingDomainRequest extends JsonSerializableType
{
    /**
     * @var string $hostname The domain itself or a subdomain of it, without a scheme or path. Point its MX at coss.com with the record the response lists. Using the domain itself moves all of its mail to coss.com, so a subdomain is usually the better choice.
     */
    #[JsonProperty('hostname')]
    public string $hostname;

    /**
     * @param array{
     *   hostname: string,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->hostname = $values['hostname'];
    }
}
