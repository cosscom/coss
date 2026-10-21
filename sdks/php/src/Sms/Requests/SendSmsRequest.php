<?php

namespace Coss\Sms\Requests;

use Coss\Core\Json\JsonSerializableType;
use Coss\Core\Json\JsonProperty;
use Coss\Sms\Types\SendSmsRequestTagsItem;
use Coss\Core\Types\ArrayType;
use DateTime;
use Coss\Core\Types\Date;

class SendSmsRequest extends JsonSerializableType
{
    /**
     * @var ?string $idempotencyKey Makes retries safe: a repeated request with the same key and body returns the original message (with its current status) instead of sending again, for 24 hours. 1-256 characters.
     */
    public ?string $idempotencyKey;

    /**
     * @var string $from One of your organization's phone numbers, in E.164 form. Sandbox environments accept any number.
     */
    #[JsonProperty('from')]
    public string $from;

    /**
     * @var string $to The recipient's mobile number, in E.164 form.
     */
    #[JsonProperty('to')]
    public string $to;

    /**
     * @var string $body The text. Messages are split into segments of 153 GSM-7 or 67 Unicode characters (152 or 66 from a toll-free number; 160 or 70 for a single one), each billed; at most 10 (1,520 GSM-7 or 660 Unicode characters).
     */
    #[JsonProperty('body')]
    public string $body;

    /**
     * @var ?array<SendSmsRequestTagsItem> $tags Up to 10 tags.
     */
    #[JsonProperty('tags'), ArrayType([SendSmsRequestTagsItem::class])]
    public ?array $tags;

    /**
     * @var ?DateTime $scheduledAt Send at this time instead of now (ISO 8601 with an offset, at most 30 days ahead). A time that is not in the future sends immediately.
     */
    #[JsonProperty('scheduled_at'), Date(Date::TYPE_DATETIME)]
    public ?DateTime $scheduledAt;

    /**
     * @param array{
     *   from: string,
     *   to: string,
     *   body: string,
     *   idempotencyKey?: ?string,
     *   tags?: ?array<SendSmsRequestTagsItem>,
     *   scheduledAt?: ?DateTime,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->idempotencyKey = $values['idempotencyKey'] ?? null;
        if (array_key_exists('idempotencyKey', $values)) {
            $this->_setField('idempotencyKey');
        }
        $this->from = $values['from'];
        $this->to = $values['to'];
        $this->body = $values['body'];
        $this->tags = $values['tags'] ?? null;
        if (array_key_exists('tags', $values)) {
            $this->_setField('tags');
        }
        $this->scheduledAt = $values['scheduledAt'] ?? null;
        if (array_key_exists('scheduledAt', $values)) {
            $this->_setField('scheduledAt');
        }
    }
}
