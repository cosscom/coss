<?php

namespace Coss\Sms\Suppressions\Requests;

use Coss\Core\Json\JsonSerializableType;

class CheckSuppressionsRequest extends JsonSerializableType
{
    /**
     * @var string $phoneNumber
     */
    public string $phoneNumber;

    /**
     * @param array{
     *   phoneNumber: string,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->phoneNumber = $values['phoneNumber'];
    }
}
