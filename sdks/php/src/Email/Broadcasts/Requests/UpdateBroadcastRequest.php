<?php

namespace Coss\Email\Broadcasts\Requests;

use Coss\Core\Json\JsonSerializableType;
use Coss\Core\Json\JsonProperty;
use Coss\Core\Types\ArrayType;
use Coss\Email\Broadcasts\Types\UpdateBroadcastRequestTracking;

class UpdateBroadcastRequest extends JsonSerializableType
{
    /**
     * @var ?string $name Shown only to you.
     */
    #[JsonProperty('name')]
    public ?string $name;

    /**
     * @var ?string $audienceId
     */
    #[JsonProperty('audience_id')]
    public ?string $audienceId;

    /**
     * @var ?string $segmentId
     */
    #[JsonProperty('segment_id')]
    public ?string $segmentId;

    /**
     * @var ?string $topic
     */
    #[JsonProperty('topic')]
    public ?string $topic;

    /**
     * @var ?string $from
     */
    #[JsonProperty('from')]
    public ?string $from;

    /**
     * @var ?array<string> $replyTo
     */
    #[JsonProperty('reply_to'), ArrayType(['string'])]
    public ?array $replyTo;

    /**
     * @var ?string $subject May use `{{{contact.<key>|fallback}}}` (e.g. `{{{contact.first_name|there}}}`).
     */
    #[JsonProperty('subject')]
    public ?string $subject;

    /**
     * @var ?string $previewText
     */
    #[JsonProperty('preview_text')]
    public ?string $previewText;

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
     * @var ?UpdateBroadcastRequestTracking $tracking
     */
    #[JsonProperty('tracking')]
    public ?UpdateBroadcastRequestTracking $tracking;

    /**
     * @var ?int $ratePerSecond
     */
    #[JsonProperty('rate_per_second')]
    public ?int $ratePerSecond;

    /**
     * @param array{
     *   name?: ?string,
     *   audienceId?: ?string,
     *   segmentId?: ?string,
     *   topic?: ?string,
     *   from?: ?string,
     *   replyTo?: ?array<string>,
     *   subject?: ?string,
     *   previewText?: ?string,
     *   html?: ?string,
     *   text?: ?string,
     *   tracking?: ?UpdateBroadcastRequestTracking,
     *   ratePerSecond?: ?int,
     * } $values
     */
    public function __construct(
        array $values = [],
    ) {
        $this->name = $values['name'] ?? null;
        $this->audienceId = $values['audienceId'] ?? null;
        $this->segmentId = $values['segmentId'] ?? null;
        $this->topic = $values['topic'] ?? null;
        $this->from = $values['from'] ?? null;
        $this->replyTo = $values['replyTo'] ?? null;
        $this->subject = $values['subject'] ?? null;
        $this->previewText = $values['previewText'] ?? null;
        $this->html = $values['html'] ?? null;
        $this->text = $values['text'] ?? null;
        $this->tracking = $values['tracking'] ?? null;
        $this->ratePerSecond = $values['ratePerSecond'] ?? null;
    }
}
