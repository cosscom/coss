<?php

namespace Coss\Types;

use Coss\Core\Json\JsonSerializableType;
use Coss\Core\Json\JsonProperty;

class SendEmailAttachment extends JsonSerializableType
{
    /**
     * @var string $filename
     */
    #[JsonProperty('filename')]
    public string $filename;

    /**
     * @var string $content The file's bytes, base64-encoded.
     */
    #[JsonProperty('content')]
    public string $content;

    /**
     * @var ?string $contentType Defaults from the filename's extension.
     */
    #[JsonProperty('content_type')]
    public ?string $contentType;

    /**
     * @var ?string $contentId Makes the attachment inline: reference it from `html` as `<img src="cid:logo@acme">`.
     */
    #[JsonProperty('content_id')]
    public ?string $contentId;

    /**
     * @param array{
     *   filename: string,
     *   content: string,
     *   contentType?: ?string,
     *   contentId?: ?string,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->filename = $values['filename'];
        $this->content = $values['content'];
        $this->contentType = $values['contentType'] ?? null;
        if (array_key_exists('contentType', $values)) {
            $this->_setField('contentType');
        }
        $this->contentId = $values['contentId'] ?? null;
        if (array_key_exists('contentId', $values)) {
            $this->_setField('contentId');
        }
    }

    /**
     * @return string
     */
    public function __toString(): string
    {
        return $this->toJson();
    }
}
