<?php

namespace Coss\Domains\Tracking\Requests;

use Coss\Core\Json\JsonSerializableType;
use Coss\Core\Json\JsonProperty;

class CreateTrackingDomainRequest extends JsonSerializableType
{
    /**
     * @var string $hostname A subdomain of the domain to serve tracking links from, without a scheme or path. Point it at coss.com with the CNAME record the response lists.
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
