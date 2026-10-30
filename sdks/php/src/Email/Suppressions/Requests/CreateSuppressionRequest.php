<?php

namespace Coss\Email\Suppressions\Requests;

use Coss\Core\Json\JsonSerializableType;
use Coss\Core\Json\JsonProperty;
use Coss\Email\Suppressions\Types\CreateSuppressionRequestScopeZero;
use Coss\Email\Suppressions\Types\CreateSuppressionRequestScopeOne;
use Coss\Core\Types\Union;

class CreateSuppressionRequest extends JsonSerializableType
{
    /**
     * @var string $address The address to suppress. Display names are ignored; matching is case-insensitive.
     */
    #[JsonProperty('address')]
    public string $address;

    /**
     * @var (
     *    value-of<CreateSuppressionRequestScopeZero>
     *   |value-of<CreateSuppressionRequestScopeOne>
     *   |string
     * )|null $scope Defaults to `*` (every email). Pass a category, e.g. "marketing", to only skip those.
     */
    #[JsonProperty('scope'), Union('string', 'null')]
    public string|null $scope;

    /**
     * @var ?string $subaccount Add it to a sub-account's own list (its id or your uid) instead of the environment's.
     */
    #[JsonProperty('subaccount')]
    public ?string $subaccount;

    /**
     * @param array{
     *   address: string,
     *   scope?: (
     *    value-of<CreateSuppressionRequestScopeZero>
     *   |value-of<CreateSuppressionRequestScopeOne>
     *   |string
     * )|null,
     *   subaccount?: ?string,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->address = $values['address'];
        $this->scope = $values['scope'] ?? null;
        if (array_key_exists('scope', $values)) {
            $this->_setField('scope');
        }
        $this->subaccount = $values['subaccount'] ?? null;
        if (array_key_exists('subaccount', $values)) {
            $this->_setField('subaccount');
        }
    }
}
