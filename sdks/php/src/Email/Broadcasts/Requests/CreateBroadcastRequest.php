<?php

namespace Coss\Email\Broadcasts\Requests;

use Coss\Core\Json\JsonSerializableType;
use Coss\Core\Json\JsonProperty;
use Coss\Core\Types\ArrayType;
use Coss\Email\Broadcasts\Types\CreateBroadcastRequestTracking;
use DateTime;
use Coss\Core\Types\Date;

class CreateBroadcastRequest extends JsonSerializableType
{
    /**
     * @var ?string $idempotencyKey Makes retries safe: a repeated request with the same key and body returns the broadcast created first instead of creating another, for 24 hours. 1-256 characters.
     */
    public ?string $idempotencyKey;

    /**
     * @var string $name Shown only to you.
     */
    #[JsonProperty('name')]
    public string $name;

    /**
     * @var ?string $audienceId Send to this audience…
     */
    #[JsonProperty('audience_id')]
    public ?string $audienceId;

    /**
     * @var ?string $segmentId …or to this segment (one of the two).
     */
    #[JsonProperty('segment_id')]
    public ?string $segmentId;

    /**
     * @var ?string $topic The topic the broadcast is about (its key): only contacts it reaches get it, and its unsubscribe link leaves just that topic. It is the emails' `category`.
     */
    #[JsonProperty('topic')]
    public ?string $topic;

    /**
     * @var string $from
     */
    #[JsonProperty('from')]
    public string $from;

    /**
     * @var ?array<string> $replyTo
     */
    #[JsonProperty('reply_to'), ArrayType(['string'])]
    public ?array $replyTo;

    /**
     * @var string $subject May use `{{{contact.<key>|fallback}}}` (e.g. `{{{contact.first_name|there}}}`).
     */
    #[JsonProperty('subject')]
    public string $subject;

    /**
     * @var ?string $previewText The inbox preview line (a hidden preheader at the start of the HTML).
     */
    #[JsonProperty('preview_text')]
    public ?string $previewText;

    /**
     * @var ?string $html `{{{contact.<key>|fallback}}}` for contact fields and properties (escaped), and `{{{unsubscribe_url}}}`, `{{{preferences_url}}}`, `{{{mailing_address}}}`; a footer with the postal address and an unsubscribe link is added unless they are there.
     */
    #[JsonProperty('html')]
    public ?string $html;

    /**
     * @var ?string $text
     */
    #[JsonProperty('text')]
    public ?string $text;

    /**
     * @var ?CreateBroadcastRequestTracking $tracking
     */
    #[JsonProperty('tracking')]
    public ?CreateBroadcastRequestTracking $tracking;

    /**
     * @var ?int $ratePerSecond Recipients per second, at most the plan's marketing rate (the default).
     */
    #[JsonProperty('rate_per_second')]
    public ?int $ratePerSecond;

    /**
     * @var ?bool $send Start sending right away.
     */
    #[JsonProperty('send')]
    public ?bool $send;

    /**
     * @var ?DateTime $scheduledAt Start sending at this time (ISO 8601 with an offset, at most 30 days ahead).
     */
    #[JsonProperty('scheduled_at'), Date(Date::TYPE_DATETIME)]
    public ?DateTime $scheduledAt;

    /**
     * @param array{
     *   name: string,
     *   from: string,
     *   subject: string,
     *   idempotencyKey?: ?string,
     *   audienceId?: ?string,
     *   segmentId?: ?string,
     *   topic?: ?string,
     *   replyTo?: ?array<string>,
     *   previewText?: ?string,
     *   html?: ?string,
     *   text?: ?string,
     *   tracking?: ?CreateBroadcastRequestTracking,
     *   ratePerSecond?: ?int,
     *   send?: ?bool,
     *   scheduledAt?: ?DateTime,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->idempotencyKey = $values['idempotencyKey'] ?? null;
        $this->name = $values['name'];
        $this->audienceId = $values['audienceId'] ?? null;
        $this->segmentId = $values['segmentId'] ?? null;
        $this->topic = $values['topic'] ?? null;
        $this->from = $values['from'];
        $this->replyTo = $values['replyTo'] ?? null;
        $this->subject = $values['subject'];
        $this->previewText = $values['previewText'] ?? null;
        $this->html = $values['html'] ?? null;
        $this->text = $values['text'] ?? null;
        $this->tracking = $values['tracking'] ?? null;
        $this->ratePerSecond = $values['ratePerSecond'] ?? null;
        $this->send = $values['send'] ?? null;
        $this->scheduledAt = $values['scheduledAt'] ?? null;
    }
}
