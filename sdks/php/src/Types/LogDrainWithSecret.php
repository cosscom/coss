<?php

namespace Coss\Types;

use Coss\Core\Json\JsonSerializableType;
use Coss\Core\Json\JsonProperty;
use Coss\Core\Types\ArrayType;
use DateTime;
use Coss\Core\Types\Date;

class LogDrainWithSecret extends JsonSerializableType
{
    /**
     * @var value-of<LogDrainWithSecretObject> $object
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
     * @var ?value-of<LogDrainWithSecretDisabledReason> $disabledReason `manual`: someone disabled it. `failing`: a batch failed every attempt, so coss.com disabled it. `null` while enabled.
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
     * @var string $secret The drain's `whsec_…` signing secret, used to verify the batches coss.com sends. Returned only when the drain is created — store it now; it cannot be read back through the API.
     */
    #[JsonProperty('secret')]
    public string $secret;

    /**
     * @param array{
     *   object: value-of<LogDrainWithSecretObject>,
     *   id: string,
     *   url: string,
     *   sources: array<value-of<LogDrainSource>>,
     *   enabled: bool,
     *   createdAt: DateTime,
     *   updatedAt: DateTime,
     *   secret: string,
     *   description?: ?string,
     *   disabledReason?: ?value-of<LogDrainWithSecretDisabledReason>,
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
        if (array_key_exists('description', $values)) {
            $this->_setField('description');
        }
        $this->sources = $values['sources'];
        $this->enabled = $values['enabled'];
        $this->disabledReason = $values['disabledReason'] ?? null;
        if (array_key_exists('disabledReason', $values)) {
            $this->_setField('disabledReason');
        }
        $this->disabledAt = $values['disabledAt'] ?? null;
        if (array_key_exists('disabledAt', $values)) {
            $this->_setField('disabledAt');
        }
        $this->createdAt = $values['createdAt'];
        $this->updatedAt = $values['updatedAt'];
        $this->secret = $values['secret'];
    }

    /**
     * @return string
     */
    public function __toString(): string
    {
        return $this->toJson();
    }
}
