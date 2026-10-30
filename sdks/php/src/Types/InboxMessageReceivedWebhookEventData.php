<?php

namespace Coss\Types;

use Coss\Core\Json\JsonSerializableType;
use Coss\Core\Json\JsonProperty;
use Coss\Core\Types\ArrayType;
use DateTime;
use Coss\Core\Types\Date;

class InboxMessageReceivedWebhookEventData extends JsonSerializableType
{
    /**
     * @var string $inboxId
     */
    #[JsonProperty('inbox_id')]
    public string $inboxId;

    /**
     * @var string $inboxAddress
     */
    #[JsonProperty('inbox_address')]
    public string $inboxAddress;

    /**
     * @var string $threadId
     */
    #[JsonProperty('thread_id')]
    public string $threadId;

    /**
     * @var string $messageId The inbox message's id (`imsg_…`).
     */
    #[JsonProperty('message_id')]
    public string $messageId;

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
     * @var ?string $subject
     */
    #[JsonProperty('subject')]
    public ?string $subject;

    /**
     * @var int $attachmentCount
     */
    #[JsonProperty('attachment_count')]
    public int $attachmentCount;

    /**
     * @var bool $newThread Whether the message started its thread.
     */
    #[JsonProperty('new_thread')]
    public bool $newThread;

    /**
     * @var bool $spam
     */
    #[JsonProperty('spam')]
    public bool $spam;

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
     *   inboxId: string,
     *   inboxAddress: string,
     *   threadId: string,
     *   messageId: string,
     *   receivedEmailId: string,
     *   to: array<string>,
     *   attachmentCount: int,
     *   newThread: bool,
     *   spam: bool,
     *   sandbox: bool,
     *   receivedAt: DateTime,
     *   from?: ?string,
     *   subject?: ?string,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->inboxId = $values['inboxId'];
        $this->inboxAddress = $values['inboxAddress'];
        $this->threadId = $values['threadId'];
        $this->messageId = $values['messageId'];
        $this->receivedEmailId = $values['receivedEmailId'];
        $this->from = $values['from'] ?? null;
        if (array_key_exists('from', $values)) {
            $this->_setField('from');
        }
        $this->to = $values['to'];
        $this->subject = $values['subject'] ?? null;
        if (array_key_exists('subject', $values)) {
            $this->_setField('subject');
        }
        $this->attachmentCount = $values['attachmentCount'];
        $this->newThread = $values['newThread'];
        $this->spam = $values['spam'];
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
