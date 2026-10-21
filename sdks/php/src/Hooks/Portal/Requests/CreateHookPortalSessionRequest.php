<?php

namespace Coss\Hooks\Portal\Requests;

use Coss\Core\Json\JsonSerializableType;
use Coss\Core\Json\JsonProperty;

class CreateHookPortalSessionRequest extends JsonSerializableType
{
    /**
     * @var ?int $expiresIn Seconds until it expires: default 3600, at most 86400.
     */
    #[JsonProperty('expires_in')]
    public ?int $expiresIn;

    /**
     * @var ?bool $readOnly The user can look but not change anything.
     */
    #[JsonProperty('read_only')]
    public ?bool $readOnly;

    /**
     * @param array{
     *   expiresIn?: ?int,
     *   readOnly?: ?bool,
     * } $values
     */
    public function __construct(
        array $values = [],
    ) {
        $this->expiresIn = $values['expiresIn'] ?? null;
        if (array_key_exists('expiresIn', $values)) {
            $this->_setField('expiresIn');
        }
        $this->readOnly = $values['readOnly'] ?? null;
        if (array_key_exists('readOnly', $values)) {
            $this->_setField('readOnly');
        }
    }
}
