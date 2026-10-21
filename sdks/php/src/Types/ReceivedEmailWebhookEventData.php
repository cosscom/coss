<?php

namespace Coss\Types;

use Coss\Core\Json\JsonSerializableType;
use Coss\Core\Json\JsonProperty;
use Coss\Core\Types\ArrayType;
use DateTime;
use Coss\Core\Types\Date;

class ReceivedEmailWebhookEventData extends JsonSerializableType
{
    /**
     * @var string $receivedEmailId
     */
    #[JsonProperty('received_email_id')]
    public string $receivedEmailId;

    /**
     * @var ?string $from
     */
    #[JsonProperty('from')]
    public ?string $from;

    /**
     * @var array<string> $to
     */
    #[JsonProperty('to'), ArrayType(['string'])]
    public array $to;

    /**
     * @var array<string> $recipients
     */
    #[JsonProperty('recipients'), ArrayType(['string'])]
    public array $recipients;

    /**
     * @var ?string $subject
     */
    #[JsonProperty('subject')]
    public ?string $subject;

    /**
     * @var ?string $messageId
     */
    #[JsonProperty('message_id')]
    public ?string $messageId;

    /**
     * @var int $attachmentCount
     */
    #[JsonProperty('attachment_count')]
    public int $attachmentCount;

    /**
     * @var int $size
     */
    #[JsonProperty('size')]
    public int $size;

    /**
     * @var bool $spam
     */
    #[JsonProperty('spam')]
    public bool $spam;

    /**
     * @var ReceivedEmailVerdicts $verdicts
     */
    #[JsonProperty('verdicts')]
    public ReceivedEmailVerdicts $verdicts;

    /**
     * @var bool $sandbox
     */
    #[JsonProperty('sandbox')]
    public bool $sandbox;

    /**
     * @var DateTime $receivedAt
     */
    #[JsonProperty('received_at'), Date(Date::TYPE_DATETIME)]
    public DateTime $receivedAt;

    /**
     * @param array{
     *   receivedEmailId: string,
     *   to: array<string>,
     *   recipients: array<string>,
     *   attachmentCount: int,
     *   size: int,
     *   spam: bool,
     *   verdicts: ReceivedEmailVerdicts,
     *   sandbox: bool,
     *   receivedAt: DateTime,
     *   from?: ?string,
     *   subject?: ?string,
     *   messageId?: ?string,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->receivedEmailId = $values['receivedEmailId'];
        $this->from = $values['from'] ?? null;
        $this->to = $values['to'];
        $this->recipients = $values['recipients'];
        $this->subject = $values['subject'] ?? null;
        $this->messageId = $values['messageId'] ?? null;
        $this->attachmentCount = $values['attachmentCount'];
        $this->size = $values['size'];
        $this->spam = $values['spam'];
        $this->verdicts = $values['verdicts'];
        $this->sandbox = $values['sandbox'];
        $this->receivedAt = $values['receivedAt'];
    }

    /**
     * @return string
     */
    public function __toString(): string
    {
        return $this->toJson();
    }
}
