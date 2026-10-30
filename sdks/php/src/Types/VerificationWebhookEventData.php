<?php

namespace Coss\Types;

use Coss\Core\Json\JsonSerializableType;
use Coss\Core\Json\JsonProperty;
use Coss\Core\Types\ArrayType;
use DateTime;
use Coss\Core\Types\Date;

class VerificationWebhookEventData extends JsonSerializableType
{
    /**
     * @var string $verificationId
     */
    #[JsonProperty('verification_id')]
    public string $verificationId;

    /**
     * @var value-of<VerificationWebhookEventDataChannel> $channel
     */
    #[JsonProperty('channel')]
    public string $channel;

    /**
     * @var string $to
     */
    #[JsonProperty('to')]
    public string $to;

    /**
     * @var value-of<VerificationWebhookEventDataStatus> $status
     */
    #[JsonProperty('status')]
    public string $status;

    /**
     * @var ?VerificationWebhookEventDataFailure $failure
     */
    #[JsonProperty('failure')]
    public ?VerificationWebhookEventDataFailure $failure;

    /**
     * @var array<VerificationWebhookEventDataReasonsItem> $reasons
     */
    #[JsonProperty('reasons'), ArrayType([VerificationWebhookEventDataReasonsItem::class])]
    public array $reasons;

    /**
     * @var array<VerificationWebhookEventDataTagsItem> $tags
     */
    #[JsonProperty('tags'), ArrayType([VerificationWebhookEventDataTagsItem::class])]
    public array $tags;

    /**
     * @var bool $sandbox
     */
    #[JsonProperty('sandbox')]
    public bool $sandbox;

    /**
     * @var DateTime $occurredAt
     */
    #[JsonProperty('occurred_at'), Date(Date::TYPE_DATETIME)]
    public DateTime $occurredAt;

    /**
     * @param array{
     *   verificationId: string,
     *   channel: value-of<VerificationWebhookEventDataChannel>,
     *   to: string,
     *   status: value-of<VerificationWebhookEventDataStatus>,
     *   reasons: array<VerificationWebhookEventDataReasonsItem>,
     *   tags: array<VerificationWebhookEventDataTagsItem>,
     *   sandbox: bool,
     *   occurredAt: DateTime,
     *   failure?: ?VerificationWebhookEventDataFailure,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->verificationId = $values['verificationId'];
        $this->channel = $values['channel'];
        $this->to = $values['to'];
        $this->status = $values['status'];
        $this->failure = $values['failure'] ?? null;
        if (array_key_exists('failure', $values)) {
            $this->_setField('failure');
        }
        $this->reasons = $values['reasons'];
        $this->tags = $values['tags'];
        $this->sandbox = $values['sandbox'];
        $this->occurredAt = $values['occurredAt'];
    }

    /**
     * @return string
     */
    public function __toString(): string
    {
        return $this->toJson();
    }
}
