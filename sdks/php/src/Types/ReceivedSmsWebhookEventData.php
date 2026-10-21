<?php

namespace Coss\Types;

use Coss\Core\Json\JsonSerializableType;
use Coss\Core\Json\JsonProperty;
use DateTime;
use Coss\Core\Types\Date;

class ReceivedSmsWebhookEventData extends JsonSerializableType
{
    /**
     * @var ?string $receivedSmsId The received message; `null` for an opt-out to a number whose replies go to no environment.
     */
    #[JsonProperty('received_sms_id')]
    public ?string $receivedSmsId;

    /**
     * @var string $from
     */
    #[JsonProperty('from')]
    public string $from;

    /**
     * @var string $to
     */
    #[JsonProperty('to')]
    public string $to;

    /**
     * @var ?value-of<ReceivedSmsWebhookEventDataKeyword> $keyword
     */
    #[JsonProperty('keyword')]
    public ?string $keyword;

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
     *   from: string,
     *   to: string,
     *   sandbox: bool,
     *   occurredAt: DateTime,
     *   receivedSmsId?: ?string,
     *   keyword?: ?value-of<ReceivedSmsWebhookEventDataKeyword>,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->receivedSmsId = $values['receivedSmsId'] ?? null;
        if (array_key_exists('receivedSmsId', $values)) {
            $this->_setField('receivedSmsId');
        }
        $this->from = $values['from'];
        $this->to = $values['to'];
        $this->keyword = $values['keyword'] ?? null;
        if (array_key_exists('keyword', $values)) {
            $this->_setField('keyword');
        }
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
