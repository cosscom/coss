<?php

namespace Coss\Types;

use Coss\Core\Json\JsonSerializableType;
use Coss\Core\Json\JsonProperty;
use Coss\Core\Types\ArrayType;

class EmailTemplateVersionList extends JsonSerializableType
{
    /**
     * @var value-of<EmailTemplateVersionListObject> $object
     */
    #[JsonProperty('object')]
    public string $object;

    /**
     * @var array<EmailTemplateVersion> $data
     */
    #[JsonProperty('data'), ArrayType([EmailTemplateVersion::class])]
    public array $data;

    /**
     * @var bool $hasMore
     */
    #[JsonProperty('has_more')]
    public bool $hasMore;

    /**
     * @param array{
     *   object: value-of<EmailTemplateVersionListObject>,
     *   data: array<EmailTemplateVersion>,
     *   hasMore: bool,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->object = $values['object'];
        $this->data = $values['data'];
        $this->hasMore = $values['hasMore'];
    }

    /**
     * @return string
     */
    public function __toString(): string
    {
        return $this->toJson();
    }
}
