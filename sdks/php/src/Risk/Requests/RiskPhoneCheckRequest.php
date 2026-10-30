<?php

namespace Coss\Risk\Requests;

use Coss\Core\Json\JsonSerializableType;
use Coss\Core\Json\JsonProperty;

class RiskPhoneCheckRequest extends JsonSerializableType
{
    /**
     * @var string $phone The number in E.164 (`+14155550123`); spaces, dashes, dots and brackets are ignored. Anything else is `valid: false`.
     */
    #[JsonProperty('phone')]
    public string $phone;

    /**
     * @param array{
     *   phone: string,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->phone = $values['phone'];
    }
}
