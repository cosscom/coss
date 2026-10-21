<?php

namespace Coss\Types;

use Coss\Core\Json\JsonSerializableType;
use Coss\Core\Json\JsonProperty;
use DateTime;
use Coss\Core\Types\Date;

/**
 * Whether coss.com keeps the email's content after sending it.
 */
class EmailContentStorage extends JsonSerializableType
{
    /**
     * @var value-of<EmailContentStorageMode> $mode The environment's content storage when the email was sent. With `discard`, the subject, `html`, `text`, `headers`, template variables and attachment filenames are cleared once the email is sent, fails or is canceled.
     */
    #[JsonProperty('mode')]
    public string $mode;

    /**
     * @var ?DateTime $discardedAt When the content was cleared; `null` while it is kept. A cleared email has an empty `subject`, `html` and `text` `null` and no `headers`.
     */
    #[JsonProperty('discarded_at'), Date(Date::TYPE_DATETIME)]
    public ?DateTime $discardedAt;

    /**
     * @param array{
     *   mode: value-of<EmailContentStorageMode>,
     *   discardedAt?: ?DateTime,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->mode = $values['mode'];
        $this->discardedAt = $values['discardedAt'] ?? null;
        if (array_key_exists('discardedAt', $values)) {
            $this->_setField('discardedAt');
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
