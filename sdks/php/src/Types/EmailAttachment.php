<?php

namespace Coss\Types;

use Coss\Core\Json\JsonSerializableType;
use Coss\Core\Json\JsonProperty;

class EmailAttachment extends JsonSerializableType
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
     * @var string $contentType
     */
    #[JsonProperty('content_type')]
    public string $contentType;

    /**
     * @var ?string $contentId Set for inline attachments (`cid:` references).
     */
    #[JsonProperty('content_id')]
    public ?string $contentId;

    /**
     * @var int $size Size in bytes.
     */
    #[JsonProperty('size')]
    public int $size;

    /**
     * @param array{
     *   id: string,
     *   filename: string,
     *   contentType: string,
     *   size: int,
     *   contentId?: ?string,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->id = $values['id'];
        $this->filename = $values['filename'];
        $this->contentType = $values['contentType'];
        $this->contentId = $values['contentId'] ?? null;
        $this->size = $values['size'];
    }

    /**
     * @return string
     */
    public function __toString(): string
    {
        return $this->toJson();
    }
}
