<?php

namespace Coss\Domains\Requests;

use Coss\Core\Json\JsonSerializableType;

class ListDomainsRequest extends JsonSerializableType
{
    /**
     * @var ?string $subaccount Only this sub-account's domains (its id or your uid).
     */
    public ?string $subaccount;

    /**
     * @param array{
     *   subaccount?: ?string,
     * } $values
     */
    public function __construct(
        array $values = [],
    ) {
        $this->subaccount = $values['subaccount'] ?? null;
        if (array_key_exists('subaccount', $values)) {
            $this->_setField('subaccount');
        }
    }
}
