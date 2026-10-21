<?php

namespace Coss\Types;

use Coss\Core\Json\JsonSerializableType;
use Coss\Core\Json\JsonProperty;
use Coss\Core\Types\ArrayType;

class SuppressionImport extends JsonSerializableType
{
    /**
     * @var value-of<SuppressionImportObject> $object
     */
    #[JsonProperty('object')]
    public string $object;

    /**
     * @var int $created Entries added by this import.
     */
    #[JsonProperty('created')]
    public int $created;

    /**
     * @var int $existing Valid entries that were already on the list (or repeated within this import); unchanged.
     */
    #[JsonProperty('existing')]
    public int $existing;

    /**
     * @var array<SuppressionImportInvalidItem> $invalid Entries that were skipped, with the reason.
     */
    #[JsonProperty('invalid'), ArrayType([SuppressionImportInvalidItem::class])]
    public array $invalid;

    /**
     * @param array{
     *   object: value-of<SuppressionImportObject>,
     *   created: int,
     *   existing: int,
     *   invalid: array<SuppressionImportInvalidItem>,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->object = $values['object'];
        $this->created = $values['created'];
        $this->existing = $values['existing'];
        $this->invalid = $values['invalid'];
    }

    /**
     * @return string
     */
    public function __toString(): string
    {
        return $this->toJson();
    }
}
