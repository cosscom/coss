<?php

namespace Coss\Types;

use Coss\Core\Json\JsonSerializableType;
use Coss\Core\Json\JsonProperty;

class SuppressionImportInvalidItem extends JsonSerializableType
{
    /**
     * @var int $index Position of the entry in the request.
     */
    #[JsonProperty('index')]
    public int $index;

    /**
     * @var string $address
     */
    #[JsonProperty('address')]
    public string $address;

    /**
     * @var string $message
     */
    #[JsonProperty('message')]
    public string $message;

    /**
     * @param array{
     *   index: int,
     *   address: string,
     *   message: string,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->index = $values['index'];
        $this->address = $values['address'];
        $this->message = $values['message'];
    }

    /**
     * @return string
     */
    public function __toString(): string
    {
        return $this->toJson();
    }
}
