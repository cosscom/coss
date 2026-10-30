<?php

namespace Coss\Verify\Requests;

use Coss\Core\Json\JsonSerializableType;
use Coss\Core\Json\JsonProperty;

class CheckVerificationRequest extends JsonSerializableType
{
    /**
     * @var ?string $idempotencyKey Makes retries safe: a repeated check with the same key returns the same answer without spending another attempt. 1-256 characters.
     */
    public ?string $idempotencyKey;

    /**
     * @var ?string $verificationId The verification to check. Give this or `to`.
     */
    #[JsonProperty('verification_id')]
    public ?string $verificationId;

    /**
     * @var ?string $to The destination the code was sent to: checks its most recent verification. Give this or `verification_id`.
     */
    #[JsonProperty('to')]
    public ?string $to;

    /**
     * @var string $code The code the end user entered.
     */
    #[JsonProperty('code')]
    public string $code;

    /**
     * @param array{
     *   code: string,
     *   idempotencyKey?: ?string,
     *   verificationId?: ?string,
     *   to?: ?string,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->idempotencyKey = $values['idempotencyKey'] ?? null;
        if (array_key_exists('idempotencyKey', $values)) {
            $this->_setField('idempotencyKey');
        }
        $this->verificationId = $values['verificationId'] ?? null;
        if (array_key_exists('verificationId', $values)) {
            $this->_setField('verificationId');
        }
        $this->to = $values['to'] ?? null;
        if (array_key_exists('to', $values)) {
            $this->_setField('to');
        }
        $this->code = $values['code'];
    }
}
