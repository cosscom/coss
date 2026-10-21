<?php

namespace Coss\Email\Audiences\Requests;

use Coss\Core\Json\JsonSerializableType;
use Coss\Core\Json\JsonProperty;
use Coss\Core\Types\ArrayType;

class AddAudienceContactsRequest extends JsonSerializableType
{
    /**
     * @var array<string> $contacts Contact ids or addresses of existing contacts.
     */
    #[JsonProperty('contacts'), ArrayType(['string'])]
    public array $contacts;

    /**
     * @param array{
     *   contacts: array<string>,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->contacts = $values['contacts'];
    }
}
