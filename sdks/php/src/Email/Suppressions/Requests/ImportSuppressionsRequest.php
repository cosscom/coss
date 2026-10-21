<?php

namespace Coss\Email\Suppressions\Requests;

use Coss\Core\Json\JsonSerializableType;
use Coss\Email\Suppressions\Types\ImportSuppressionsRequestSuppressionsItem;
use Coss\Core\Json\JsonProperty;
use Coss\Core\Types\ArrayType;

class ImportSuppressionsRequest extends JsonSerializableType
{
    /**
     * @var array<ImportSuppressionsRequestSuppressionsItem> $suppressions 1-1000 entries. Each one is validated on its own: invalid entries are skipped and reported in `invalid`, the rest are imported.
     */
    #[JsonProperty('suppressions'), ArrayType([ImportSuppressionsRequestSuppressionsItem::class])]
    public array $suppressions;

    /**
     * @param array{
     *   suppressions: array<ImportSuppressionsRequestSuppressionsItem>,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->suppressions = $values['suppressions'];
    }
}
