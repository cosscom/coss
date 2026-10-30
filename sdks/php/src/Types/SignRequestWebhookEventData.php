<?php

namespace Coss\Types;

use Coss\Core\Json\JsonSerializableType;
use Coss\Core\Json\JsonProperty;
use Coss\Core\Types\ArrayType;
use DateTime;
use Coss\Core\Types\Date;

class SignRequestWebhookEventData extends JsonSerializableType
{
    /**
     * @var string $signRequestId
     */
    #[JsonProperty('sign_request_id')]
    public string $signRequestId;

    /**
     * @var value-of<SignRequestWebhookEventDataStatus> $status The request's status after the event.
     */
    #[JsonProperty('status')]
    public string $status;

    /**
     * @var string $title
     */
    #[JsonProperty('title')]
    public string $title;

    /**
     * @var array<string, string> $metadata
     */
    #[JsonProperty('metadata'), ArrayType(['string' => 'string'])]
    public array $metadata;

    /**
     * @var ?SignRequestWebhookEventDataSigner $signer The signer who viewed, signed or declined; `null` otherwise.
     */
    #[JsonProperty('signer')]
    public ?SignRequestWebhookEventDataSigner $signer;

    /**
     * @var ?string $reason A decline's reason, if the signer gave one.
     */
    #[JsonProperty('reason')]
    public ?string $reason;

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
     *   signRequestId: string,
     *   status: value-of<SignRequestWebhookEventDataStatus>,
     *   title: string,
     *   metadata: array<string, string>,
     *   sandbox: bool,
     *   occurredAt: DateTime,
     *   signer?: ?SignRequestWebhookEventDataSigner,
     *   reason?: ?string,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->signRequestId = $values['signRequestId'];
        $this->status = $values['status'];
        $this->title = $values['title'];
        $this->metadata = $values['metadata'];
        $this->signer = $values['signer'] ?? null;
        if (array_key_exists('signer', $values)) {
            $this->_setField('signer');
        }
        $this->reason = $values['reason'] ?? null;
        if (array_key_exists('reason', $values)) {
            $this->_setField('reason');
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
