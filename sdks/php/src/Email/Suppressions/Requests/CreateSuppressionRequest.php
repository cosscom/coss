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
     * @param array{
     *   address: string,
     *   scope?: (
     *    value-of<CreateSuppressionRequestScopeZero>
     *   |value-of<CreateSuppressionRequestScopeOne>
     *   |string
     * )|null,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->address = $values['address'];
        $this->scope = $values['scope'] ?? null;
    }
}
