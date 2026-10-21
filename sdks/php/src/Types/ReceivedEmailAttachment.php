<?php

namespace Coss\Types;

use Coss\Core\Json\JsonSerializableType;
use Coss\Core\Json\JsonProperty;

class ReceivedEmailAttachment extends JsonSerializableType
{
    /**
     * @var string $id
     */
    #[JsonProperty('id')]
    public string $id;

    /**
     * @var ?string $filename `null` when the part named none.
     */
    #[JsonProperty('filename')]
    public ?string $filename;

    /**
     * @var string $contentType
     */
    #[JsonProperty('content_type')]
    public string $contentType;

    /**
     * @var ?string $contentId Set for parts the HTML references (`cid:` URLs).
     */
    #[JsonProperty('content_id')]
    public ?string $contentId;

    /**
     * @var value-of<ReceivedEmailAttachmentDisposition> $disposition
     */
    #[JsonProperty('disposition')]
    public string $disposition;

    /**
     * @var int $size Size in bytes.
     */
    #[JsonProperty('size')]
    public int $size;

    /**
     * @param array{
     *   id: string,
     *   contentType: string,
     *   disposition: value-of<ReceivedEmailAttachmentDisposition>,
     *   size: int,
     *   filename?: ?string,
     *   contentId?: ?string,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->id = $values['id'];
        $this->filename = $values['filename'] ?? null;
        if (array_key_exists('filename', $values)) {
            $this->_setField('filename');
        }
        $this->contentType = $values['contentType'];
        $this->contentId = $values['contentId'] ?? null;
        if (array_key_exists('contentId', $values)) {
            $this->_setField('contentId');
        }
        $this->disposition = $values['disposition'];
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
