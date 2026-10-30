<?php

namespace Coss\Sign\Sessions\Requests;

use Coss\Core\Json\JsonSerializableType;
use Coss\Core\Json\JsonProperty;

class CreateSignSessionRequest extends JsonSerializableType
{
    /**
     * @var ?int $expiresIn Seconds until the link expires: default 3600, at most 86400. Mint one when your user opens the page that shows it.
     */
    #[JsonProperty('expires_in')]
    public ?int $expiresIn;

    /**
     * @param array{
     *   expiresIn?: ?int,
     * } $values
     */
    public function __construct(
        array $values = [],
    ) {
        $this->expiresIn = $values['expiresIn'] ?? null;
        if (array_key_exists('expiresIn', $values)) {
            $this->_setField('expiresIn');
        }
    }
}
