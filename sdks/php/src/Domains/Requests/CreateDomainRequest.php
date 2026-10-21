<?php

namespace Coss\Domains\Requests;

use Coss\Core\Json\JsonSerializableType;
use Coss\Core\Json\JsonProperty;

class CreateDomainRequest extends JsonSerializableType
{
    /**
     * @var string $name The domain to send from, without a scheme or path. Subdomains are allowed; internationalized domains must be punycode-encoded.
     */
    #[JsonProperty('name')]
    public string $name;

    /**
     * @param array{
     *   name: string,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->name = $values['name'];
    }
}
