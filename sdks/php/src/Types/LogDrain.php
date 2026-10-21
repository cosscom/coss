<?php

namespace Coss\Types;

use Coss\Core\Json\JsonSerializableType;
use Coss\Core\Json\JsonProperty;
use Coss\Core\Types\ArrayType;
use DateTime;
use Coss\Core\Types\Date;

class LogDrain extends JsonSerializableType
{
    /**
     * @var value-of<LogDrainObject> $object
     */
    #[JsonProperty('object')]
    public string $object;

    /**
     * @var string $id
     */
    #[JsonProperty('id')]
    public string $id;

    /**
     * @var string $url
     */
    #[JsonProperty('url')]
    public string $url;

    /**
     * @var ?string $description
     */
    #[JsonProperty('description')]
    public ?string $description;

    /**
     * @var array<value-of<LogDrainSource>> $sources What the drain forwards: `api` (requests made with the environment's API keys), `email` (email events), `webhook` (webhook delivery attempts) and `audit` (changes to the environment, from the organization's audit log). An empty array means every source, including ones added later.
     */
    #[JsonProperty('sources'), ArrayType(['string'])]
    public array $sources;

    /**
     * @var bool $enabled A disabled drain receives nothing, and lines logged while it is disabled are not kept for it.
     */
    #[JsonProperty('enabled')]
    public bool $enabled;

    /**
     * @var ?value-of<LogDrainDisabledReason> $disabledReason `manual`: someone disabled it. `failing`: a batch failed every attempt, so coss.com disabled it. `null` while enabled.
     */
    #[JsonProperty('disabled_reason')]
    public ?string $disabledReason;

    /**
     * @var ?DateTime $disabledAt
     */
    #[JsonProperty('disabled_at'), Date(Date::TYPE_DATETIME)]
    public ?DateTime $disabledAt;

    /**
     * @var DateTime $createdAt
     */
    #[JsonProperty('created_at'), Date(Date::TYPE_DATETIME)]
    public DateTime $createdAt;

    /**
     * @var DateTime $updatedAt
     */
    #[JsonProperty('updated_at'), Date(Date::TYPE_DATETIME)]
    public DateTime $updatedAt;

    /**
     * @param array{
     *   object: value-of<LogDrainObject>,
     *   id: string,
     *   url: string,
     *   sources: array<value-of<LogDrainSource>>,
     *   enabled: bool,
     *   createdAt: DateTime,
     *   updatedAt: DateTime,
     *   description?: ?string,
     *   disabledReason?: ?value-of<LogDrainDisabledReason>,
     *   disabledAt?: ?DateTime,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->object = $values['object'];
        $this->id = $values['id'];
        $this->url = $values['url'];
        $this->description = $values['description'] ?? null;
        $this->sources = $values['sources'];
        $this->enabled = $values['enabled'];
        $this->disabledReason = $values['disabledReason'] ?? null;
        $this->disabledAt = $values['disabledAt'] ?? null;
        $this->createdAt = $values['createdAt'];
        $this->updatedAt = $values['updatedAt'];
    }

    /**
     * @return string
     */
    public function __toString(): string
    {
        return $this->toJson();
    }
}
