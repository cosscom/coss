<?php

namespace Coss\Sign\Templates\Types;

use Coss\Core\Json\JsonSerializableType;
use Coss\Core\Json\JsonProperty;

class UpdateSignTemplateRequestDocumentsItemDocumentId extends JsonSerializableType
{
    /**
     * @var string $documentId An uploaded document.
     */
    #[JsonProperty('document_id')]
    public string $documentId;

    /**
     * @param array{
     *   documentId: string,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->documentId = $values['documentId'];
    }

    /**
     * @return string
     */
    public function __toString(): string
    {
        return $this->toJson();
    }
}
