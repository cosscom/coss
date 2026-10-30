<?php

namespace Coss\Types;

use Coss\Core\Json\JsonSerializableType;
use Coss\Core\Json\JsonProperty;

class VerificationCheck extends JsonSerializableType
{
    /**
     * @var value-of<VerificationCheckObject> $object
     */
    #[JsonProperty('object')]
    public string $object;

    /**
     * @var bool $valid Whether the code is right. Only `true` proves the end user has the phone or mailbox; checking an approved verification again with its code stays `true` until it expires.
     */
    #[JsonProperty('valid')]
    public bool $valid;

    /**
     * @var Verification $verification
     */
    #[JsonProperty('verification')]
    public Verification $verification;

    /**
     * @param array{
     *   object: value-of<VerificationCheckObject>,
     *   valid: bool,
     *   verification: Verification,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->object = $values['object'];
        $this->valid = $values['valid'];
        $this->verification = $values['verification'];
    }

    /**
     * @return string
     */
    public function __toString(): string
    {
        return $this->toJson();
    }
}
