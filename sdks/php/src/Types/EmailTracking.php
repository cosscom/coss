<?php

namespace Coss\Types;

use Coss\Core\Json\JsonSerializableType;
use Coss\Core\Json\JsonProperty;
use DateTime;
use Coss\Core\Types\Date;

/**
 * Open and click tracking, as resolved when the email was sent, with engagement so far. Opens can be inflated by mail clients that prefetch images, clicks by link scanners.
 */
class EmailTracking extends JsonSerializableType
{
    /**
     * @var bool $opens Whether opens are tracked for this email.
     */
    #[JsonProperty('opens')]
    public bool $opens;

    /**
     * @var bool $clicks Whether link clicks are tracked for this email.
     */
    #[JsonProperty('clicks')]
    public bool $clicks;

    /**
     * @var bool $unsubscribe Whether the email carries one-click unsubscribe headers (RFC 8058).
     */
    #[JsonProperty('unsubscribe')]
    public bool $unsubscribe;

    /**
     * @var int $openCount
     */
    #[JsonProperty('open_count')]
    public int $openCount;

    /**
     * @var ?DateTime $firstOpenedAt
     */
    #[JsonProperty('first_opened_at'), Date(Date::TYPE_DATETIME)]
    public ?DateTime $firstOpenedAt;

    /**
     * @var ?DateTime $lastOpenedAt
     */
    #[JsonProperty('last_opened_at'), Date(Date::TYPE_DATETIME)]
    public ?DateTime $lastOpenedAt;

    /**
     * @var int $clickCount
     */
    #[JsonProperty('click_count')]
    public int $clickCount;

    /**
     * @var ?DateTime $firstClickedAt
     */
    #[JsonProperty('first_clicked_at'), Date(Date::TYPE_DATETIME)]
    public ?DateTime $firstClickedAt;

    /**
     * @var ?DateTime $lastClickedAt
     */
    #[JsonProperty('last_clicked_at'), Date(Date::TYPE_DATETIME)]
    public ?DateTime $lastClickedAt;

    /**
     * @param array{
     *   opens: bool,
     *   clicks: bool,
     *   unsubscribe: bool,
     *   openCount: int,
     *   clickCount: int,
     *   firstOpenedAt?: ?DateTime,
     *   lastOpenedAt?: ?DateTime,
     *   firstClickedAt?: ?DateTime,
     *   lastClickedAt?: ?DateTime,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->opens = $values['opens'];
        $this->clicks = $values['clicks'];
        $this->unsubscribe = $values['unsubscribe'];
        $this->openCount = $values['openCount'];
        $this->firstOpenedAt = $values['firstOpenedAt'] ?? null;
        $this->lastOpenedAt = $values['lastOpenedAt'] ?? null;
        $this->clickCount = $values['clickCount'];
        $this->firstClickedAt = $values['firstClickedAt'] ?? null;
        $this->lastClickedAt = $values['lastClickedAt'] ?? null;
    }

    /**
     * @return string
     */
    public function __toString(): string
    {
        return $this->toJson();
    }
}
