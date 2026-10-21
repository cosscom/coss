<?php

namespace Coss\Types;

use Coss\Core\Json\JsonSerializableType;
use Coss\Core\Json\JsonProperty;

class Error extends JsonSerializableType
{
    /**
     * @var ErrorBody $error
     */
    #[JsonProperty('error')]
    public ErrorBody $error;

    /**
     * @param array{
     *   error: ErrorBody,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->error = $values['error'];
    }

    /**
     * @return string
     */
    public function __toString(): string
    {
        return $this->toJson();
    }
}
