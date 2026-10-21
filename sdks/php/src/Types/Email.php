<?php

namespace Coss\Types;

use Coss\Core\Json\JsonSerializableType;
use Coss\Core\Json\JsonProperty;
use Coss\Core\Types\ArrayType;
use DateTime;
use Coss\Core\Types\Date;

class Email extends JsonSerializableType
{
    /**
     * @var value-of<EmailObject> $object
     */
    #[JsonProperty('object')]
    public string $object;

    /**
     * @var string $id
     */
    #[JsonProperty('id')]
    public string $id;

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
     * @var array<string> $cc
     */
    #[JsonProperty('cc'), ArrayType(['string'])]
    public array $cc;

    /**
     * @var array<string> $bcc
     */
    #[JsonProperty('bcc'), ArrayType(['string'])]
    public array $bcc;

    /**
     * @var array<string> $replyTo
     */
    #[JsonProperty('reply_to'), ArrayType(['string'])]
    public array $replyTo;

    /**
     * @var string $subject
     */
    #[JsonProperty('subject')]
    public string $subject;

    /**
     * @var ?string $html
     */
    #[JsonProperty('html')]
    public ?string $html;

    /**
     * @var ?string $text
     */
    #[JsonProperty('text')]
    public ?string $text;

    /**
     * @var array<string, string> $headers
     */
    #[JsonProperty('headers'), ArrayType(['string' => 'string'])]
    public array $headers;

    /**
     * @var array<EmailTagsItem> $tags
     */
    #[JsonProperty('tags'), ArrayType([EmailTagsItem::class])]
    public array $tags;

    /**
     * @var ?string $category
     */
    #[JsonProperty('category')]
    public ?string $category;

    /**
     * @var value-of<EmailStream> $stream
     */
    #[JsonProperty('stream')]
    public string $stream;

    /**
     * @var value-of<EmailStatus> $status Whether the email was handed to the delivery provider. `scheduled` emails wait for `scheduled_at`; `canceled` ones were canceled before that. Per-recipient delivery is in `recipients`.
     */
    #[JsonProperty('status')]
    public string $status;

    /**
     * @var ?EmailFailure $failure Why the email failed; `null` unless `status` is `failed`.
     */
    #[JsonProperty('failure')]
    public ?EmailFailure $failure;

    /**
     * @var array<EmailRecipient> $recipients
     */
    #[JsonProperty('recipients'), ArrayType([EmailRecipient::class])]
    public array $recipients;

    /**
     * @var array<EmailAttachment> $attachments Attachment metadata. Content is never returned, and is discarded once sent.
     */
    #[JsonProperty('attachments'), ArrayType([EmailAttachment::class])]
    public array $attachments;

    /**
     * @var bool $sandbox True when sent from a sandbox environment (never delivered).
     */
    #[JsonProperty('sandbox')]
    public bool $sandbox;

    /**
     * @var EmailTracking $tracking
     */
    #[JsonProperty('tracking')]
    public EmailTracking $tracking;

    /**
     * @var DateTime $createdAt
     */
    #[JsonProperty('created_at'), Date(Date::TYPE_DATETIME)]
    public DateTime $createdAt;

    /**
     * @var ?DateTime $sentAt
     */
    #[JsonProperty('sent_at'), Date(Date::TYPE_DATETIME)]
    public ?DateTime $sentAt;

    /**
     * @var ?DateTime $scheduledAt When the email was scheduled to be sent; `null` if it was not.
     */
    #[JsonProperty('scheduled_at'), Date(Date::TYPE_DATETIME)]
    public ?DateTime $scheduledAt;

    /**
     * @var ?string $batchId The batch that sent the email; `null` if it was sent on its own.
     */
    #[JsonProperty('batch_id')]
    public ?string $batchId;

    /**
     * @var ?EmailTemplateReference $template The template the email was rendered from; `null` if it was sent without one.
     */
    #[JsonProperty('template')]
    public ?EmailTemplateReference $template;

    /**
     * @var ?string $broadcastId The broadcast the email is part of; `null` for any other email.
     */
    #[JsonProperty('broadcast_id')]
    public ?string $broadcastId;

    /**
     * @var EmailContentStorage $contentStorage
     */
    #[JsonProperty('content_storage')]
    public EmailContentStorage $contentStorage;

    /**
     * @param array{
     *   object: value-of<EmailObject>,
     *   id: string,
     *   from: string,
     *   to: array<string>,
     *   cc: array<string>,
     *   bcc: array<string>,
     *   replyTo: array<string>,
     *   subject: string,
     *   headers: array<string, string>,
     *   tags: array<EmailTagsItem>,
     *   stream: value-of<EmailStream>,
     *   status: value-of<EmailStatus>,
     *   recipients: array<EmailRecipient>,
     *   attachments: array<EmailAttachment>,
     *   sandbox: bool,
     *   tracking: EmailTracking,
     *   createdAt: DateTime,
     *   contentStorage: EmailContentStorage,
     *   html?: ?string,
     *   text?: ?string,
     *   category?: ?string,
     *   failure?: ?EmailFailure,
     *   sentAt?: ?DateTime,
     *   scheduledAt?: ?DateTime,
     *   batchId?: ?string,
     *   template?: ?EmailTemplateReference,
     *   broadcastId?: ?string,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->object = $values['object'];
        $this->id = $values['id'];
        $this->from = $values['from'];
        $this->to = $values['to'];
        $this->cc = $values['cc'];
        $this->bcc = $values['bcc'];
        $this->replyTo = $values['replyTo'];
        $this->subject = $values['subject'];
        $this->html = $values['html'] ?? null;
        $this->text = $values['text'] ?? null;
        $this->headers = $values['headers'];
        $this->tags = $values['tags'];
        $this->category = $values['category'] ?? null;
        $this->stream = $values['stream'];
        $this->status = $values['status'];
        $this->failure = $values['failure'] ?? null;
        $this->recipients = $values['recipients'];
        $this->attachments = $values['attachments'];
        $this->sandbox = $values['sandbox'];
        $this->tracking = $values['tracking'];
        $this->createdAt = $values['createdAt'];
        $this->sentAt = $values['sentAt'] ?? null;
        $this->scheduledAt = $values['scheduledAt'] ?? null;
        $this->batchId = $values['batchId'] ?? null;
        $this->template = $values['template'] ?? null;
        $this->broadcastId = $values['broadcastId'] ?? null;
        $this->contentStorage = $values['contentStorage'];
    }

    /**
     * @return string
     */
    public function __toString(): string
    {
        return $this->toJson();
    }
}
