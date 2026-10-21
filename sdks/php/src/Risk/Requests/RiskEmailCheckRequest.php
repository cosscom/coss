<?php

namespace Coss\Risk\Requests;

use Coss\Core\Json\JsonSerializableType;
use Coss\Core\Json\JsonProperty;

class RiskEmailCheckRequest extends JsonSerializableType
{
    /**
     * @var string $email The address to check, as given.
     */
    #[JsonProperty('email')]
    public string $email;

    /**
     * @param array{
     *   email: string,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->email = $values['email'];
    }
}
