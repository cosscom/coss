<?php

namespace Coss\Email\Suppressions\Types;

use Coss\Core\Json\JsonSerializableType;
use Coss\Core\Json\JsonProperty;

class ImportSuppressionsRequestSuppressionsItem extends JsonSerializableType
{
    /**
     * @var string $address The address to suppress.
     */
    #[JsonProperty('address')]
    public string $address;

    /**
     * @var ?string $scope `*` (the default) or a category.
     */
    #[JsonProperty('scope')]
    public ?string $scope;

    /**
     * @param array{
     *   address: string,
     *   scope?: ?string,
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
    }

    /**
     * @return string
     */
    public function __toString(): string
    {
        return $this->toJson();
    }
}
