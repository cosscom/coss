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
     * @var ?string $subaccount Add it for one of your live sub-accounts (its id or your uid): only that sub-account sends from it, through its own reputation.
     */
    #[JsonProperty('subaccount')]
    public ?string $subaccount;

    /**
     * @param array{
     *   name: string,
     *   subaccount?: ?string,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->name = $values['name'];
        $this->subaccount = $values['subaccount'] ?? null;
        if (array_key_exists('subaccount', $values)) {
            $this->_setField('subaccount');
        }
    }
}
