<?php

namespace Coss\Inboxes\Requests;

use Coss\Core\Json\JsonSerializableType;
use Coss\Core\Json\JsonProperty;

class UpdateInboxRequest extends JsonSerializableType
{
    /**
     * @var ?string $displayName The name messages are sent with; `null` sends with the bare address.
     */
    #[JsonProperty('display_name')]
    public ?string $displayName;

    /**
     * @param array{
     *   displayName?: ?string,
     * } $values
     */
    public function __construct(
        array $values = [],
    ) {
        $this->displayName = $values['displayName'] ?? null;
        if (array_key_exists('displayName', $values)) {
            $this->_setField('displayName');
        }
    }
}
