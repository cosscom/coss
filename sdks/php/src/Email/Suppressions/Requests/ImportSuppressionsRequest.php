<?php

namespace Coss\Email\Suppressions\Requests;

use Coss\Core\Json\JsonSerializableType;
use Coss\Core\Json\JsonProperty;
use Coss\Email\Suppressions\Types\ImportSuppressionsRequestSuppressionsItem;
use Coss\Core\Types\ArrayType;

class ImportSuppressionsRequest extends JsonSerializableType
{
    /**
     * @var ?string $subaccount Import into a sub-account's own list (its id or your uid) instead of the environment's.
     */
    #[JsonProperty('subaccount')]
    public ?string $subaccount;

    /**
     * @var array<ImportSuppressionsRequestSuppressionsItem> $suppressions 1-1000 entries. Each one is validated on its own: invalid entries are skipped and reported in `invalid`, the rest are imported.
     */
    #[JsonProperty('suppressions'), ArrayType([ImportSuppressionsRequestSuppressionsItem::class])]
    public array $suppressions;

    /**
     * @param array{
     *   suppressions: array<ImportSuppressionsRequestSuppressionsItem>,
     *   subaccount?: ?string,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->subaccount = $values['subaccount'] ?? null;
        if (array_key_exists('subaccount', $values)) {
            $this->_setField('subaccount');
        }
        $this->suppressions = $values['suppressions'];
    }
}
