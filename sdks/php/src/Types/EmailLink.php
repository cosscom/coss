<?php

namespace Coss\Types;

use Coss\Core\Json\JsonSerializableType;
use Coss\Core\Json\JsonProperty;
use DateTime;
use Coss\Core\Types\Date;

class EmailLink extends JsonSerializableType
{
    /**
     * @var value-of<EmailLinkObject> $object
     */
    #[JsonProperty('object')]
    public string $object;

    /**
     * @var string $id
     */
    #[JsonProperty('id')]
    public string $id;

    /**
     * @var string $emailId
     */
    #[JsonProperty('email_id')]
    public string $emailId;

    /**
     * @var int $position Index of the link among the tracked links.
     */
    #[JsonProperty('position')]
    public int $position;

    /**
     * @var string $url
     */
    #[JsonProperty('url')]
    public string $url;

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
     *   object: value-of<EmailLinkObject>,
     *   id: string,
     *   emailId: string,
     *   position: int,
     *   url: string,
     *   clickCount: int,
     *   firstClickedAt?: ?DateTime,
     *   lastClickedAt?: ?DateTime,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->object = $values['object'];
        $this->id = $values['id'];
        $this->emailId = $values['emailId'];
        $this->position = $values['position'];
        $this->url = $values['url'];
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
