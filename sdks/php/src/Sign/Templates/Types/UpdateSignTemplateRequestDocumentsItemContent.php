<?php

namespace Coss\Sign\Templates\Types;

use Coss\Core\Json\JsonSerializableType;
use Coss\Core\Json\JsonProperty;

class UpdateSignTemplateRequestDocumentsItemContent extends JsonSerializableType
{
    /**
     * @var string $filename The file's name, ending in `.pdf`.
     */
    #[JsonProperty('filename')]
    public string $filename;

    /**
     * @var string $content The PDF's bytes, base64-encoded (at most 25 MB decoded).
     */
    #[JsonProperty('content')]
    public string $content;

    /**
     * @param array{
     *   filename: string,
     *   content: string,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->filename = $values['filename'];
        $this->content = $values['content'];
    }

    /**
     * @return string
     */
    public function __toString(): string
    {
        return $this->toJson();
    }
}
