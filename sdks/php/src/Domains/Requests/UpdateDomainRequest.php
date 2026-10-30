<?php

namespace Coss\Domains\Requests;

use Coss\Core\Json\JsonSerializableType;
use Coss\Core\Json\JsonProperty;

class UpdateDomainRequest extends JsonSerializableType
{
    /**
     * @var bool $sharedWithSubaccounts Let your sub-accounts send from this domain of yours (through your organization's reputation).
     */
    #[JsonProperty('shared_with_subaccounts')]
    public bool $sharedWithSubaccounts;

    /**
     * @param array{
     *   sharedWithSubaccounts: bool,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->sharedWithSubaccounts = $values['sharedWithSubaccounts'];
    }
}
