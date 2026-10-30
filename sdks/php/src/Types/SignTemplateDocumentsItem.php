<?php

namespace Coss\Types;

use Coss\Core\Json\JsonSerializableType;
use Coss\Core\Json\JsonProperty;
use Coss\Core\Types\ArrayType;

class SignTemplateDocumentsItem extends JsonSerializableType
{
    /**
     * @var string $id
     */
    #[JsonProperty('id')]
    public string $id;

    /**
     * @var string $filename
     */
    #[JsonProperty('filename')]
    public string $filename;

    /**
     * @var string $sha256
     */
    #[JsonProperty('sha256')]
    public string $sha256;

    /**
     * @var int $pageCount
     */
    #[JsonProperty('page_count')]
    public int $pageCount;

    /**
     * @var array<SignTemplateDocumentsItemPagesItem> $pages
     */
    #[JsonProperty('pages'), ArrayType([SignTemplateDocumentsItemPagesItem::class])]
    public array $pages;

    /**
     * @param array{
     *   id: string,
     *   filename: string,
     *   sha256: string,
     *   pageCount: int,
     *   pages: array<SignTemplateDocumentsItemPagesItem>,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->id = $values['id'];
        $this->filename = $values['filename'];
        $this->sha256 = $values['sha256'];
        $this->pageCount = $values['pageCount'];
        $this->pages = $values['pages'];
    }

    /**
     * @return string
     */
    public function __toString(): string
    {
        return $this->toJson();
    }
}
