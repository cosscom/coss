<?php

namespace Coss\Types;

use Coss\Core\Json\JsonSerializableType;
use Coss\Core\Json\JsonProperty;
use Coss\Core\Types\ArrayType;
use DateTime;
use Coss\Core\Types\Date;

class EmailWebhookEventData extends JsonSerializableType
{
    /**
     * @var ?EmailWebhookEventDataBounce $bounce
     */
    #[JsonProperty('bounce')]
    public ?EmailWebhookEventDataBounce $bounce;

    /**
     * @var ?EmailWebhookEventDataComplaint $complaint
     */
    #[JsonProperty('complaint')]
    public ?EmailWebhookEventDataComplaint $complaint;

    /**
     * @var ?EmailWebhookEventDataDelay $delay
     */
    #[JsonProperty('delay')]
    public ?EmailWebhookEventDataDelay $delay;

    /**
     * @var ?EmailWebhookEventDataDelivery $delivery
     */
    #[JsonProperty('delivery')]
    public ?EmailWebhookEventDataDelivery $delivery;

    /**
     * @var ?EmailWebhookEventDataFailure $failure
     */
    #[JsonProperty('failure')]
    public ?EmailWebhookEventDataFailure $failure;

    /**
     * @var ?EmailWebhookEventDataSuppression $suppression Only for `email.suppressed`: the entry that matched the recipient.
     */
    #[JsonProperty('suppression')]
    public ?EmailWebhookEventDataSuppression $suppression;

    /**
     * @var ?EmailWebhookEventDataUnsubscribe $unsubscribe Only for `email.suppressed` without `suppression`: the recipient is a contact who unsubscribed (from marketing, or from the email's topic, `topic`).
     */
    #[JsonProperty('unsubscribe')]
    public ?EmailWebhookEventDataUnsubscribe $unsubscribe;

    /**
     * @var ?EmailWebhookEventDataOpen $open Only for `email.opened`.
     */
    #[JsonProperty('open')]
    public ?EmailWebhookEventDataOpen $open;

    /**
     * @var ?EmailWebhookEventDataClick $click Only for `email.clicked`.
     */
    #[JsonProperty('click')]
    public ?EmailWebhookEventDataClick $click;

    /**
     * @var ?EmailWebhookEventDataReschedule $reschedule Only for `email.rescheduled`.
     */
    #[JsonProperty('reschedule')]
    public ?EmailWebhookEventDataReschedule $reschedule;

    /**
     * @var string $emailId
     */
    #[JsonProperty('email_id')]
    public string $emailId;

    /**
     * @var string $from
     */
    #[JsonProperty('from')]
    public string $from;

    /**
     * @var array<string> $to
     */
    #[JsonProperty('to'), ArrayType(['string'])]
    public array $to;

    /**
     * @var string $subject
     */
    #[JsonProperty('subject')]
    public string $subject;

    /**
     * @var array<EmailWebhookEventDataTagsItem> $tags
     */
    #[JsonProperty('tags'), ArrayType([EmailWebhookEventDataTagsItem::class])]
    public array $tags;

    /**
     * @var ?string $category
     */
    #[JsonProperty('category')]
    public ?string $category;

    /**
     * @var bool $sandbox
     */
    #[JsonProperty('sandbox')]
    public bool $sandbox;

    /**
     * @var ?string $recipient
     */
    #[JsonProperty('recipient')]
    public ?string $recipient;

    /**
     * @var DateTime $occurredAt
     */
    #[JsonProperty('occurred_at'), Date(Date::TYPE_DATETIME)]
    public DateTime $occurredAt;

    /**
     * @param array{
     *   emailId: string,
     *   from: string,
     *   to: array<string>,
     *   subject: string,
     *   tags: array<EmailWebhookEventDataTagsItem>,
     *   sandbox: bool,
     *   occurredAt: DateTime,
     *   bounce?: ?EmailWebhookEventDataBounce,
     *   complaint?: ?EmailWebhookEventDataComplaint,
     *   delay?: ?EmailWebhookEventDataDelay,
     *   delivery?: ?EmailWebhookEventDataDelivery,
     *   failure?: ?EmailWebhookEventDataFailure,
     *   suppression?: ?EmailWebhookEventDataSuppression,
     *   unsubscribe?: ?EmailWebhookEventDataUnsubscribe,
     *   open?: ?EmailWebhookEventDataOpen,
     *   click?: ?EmailWebhookEventDataClick,
     *   reschedule?: ?EmailWebhookEventDataReschedule,
     *   category?: ?string,
     *   recipient?: ?string,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->bounce = $values['bounce'] ?? null;
        $this->complaint = $values['complaint'] ?? null;
        $this->delay = $values['delay'] ?? null;
        $this->delivery = $values['delivery'] ?? null;
        $this->failure = $values['failure'] ?? null;
        $this->suppression = $values['suppression'] ?? null;
        $this->unsubscribe = $values['unsubscribe'] ?? null;
        $this->open = $values['open'] ?? null;
        $this->click = $values['click'] ?? null;
        $this->reschedule = $values['reschedule'] ?? null;
        $this->emailId = $values['emailId'];
        $this->from = $values['from'];
        $this->to = $values['to'];
        $this->subject = $values['subject'];
        $this->tags = $values['tags'];
        $this->category = $values['category'] ?? null;
        $this->sandbox = $values['sandbox'];
        $this->recipient = $values['recipient'] ?? null;
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
