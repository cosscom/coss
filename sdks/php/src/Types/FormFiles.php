<?php

namespace Coss\Types;

use Coss\Core\Json\JsonSerializableType;
use Coss\Core\Json\JsonProperty;
use Coss\Core\Types\ArrayType;

class FormFiles extends JsonSerializableType
{
    /**
     * @var bool $enabled
     */
    #[JsonProperty('enabled')]
    public bool $enabled;

    /**
     * @var int $maxFiles
     */
    #[JsonProperty('max_files')]
    public int $maxFiles;

    /**
     * @var int $maxFileBytes
     */
    #[JsonProperty('max_file_bytes')]
    public int $maxFileBytes;

    /**
     * @var array<string> $allowedTypes
     */
    #[JsonProperty('allowed_types'), ArrayType(['string'])]
    public array $allowedTypes;

    /**
     * @param array{
     *   enabled: bool,
     *   maxFiles: int,
     *   maxFileBytes: int,
     *   allowedTypes: array<string>,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->enabled = $values['enabled'];
        $this->maxFiles = $values['maxFiles'];
        $this->maxFileBytes = $values['maxFileBytes'];
        $this->allowedTypes = $values['allowedTypes'];
    }

    /**
     * @return string
     */
    public function __toString(): string
    {
        return $this->toJson();
    }
}
