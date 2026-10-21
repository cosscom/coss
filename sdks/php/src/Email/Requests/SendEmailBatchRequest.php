<?php

namespace Coss\Email\Requests;

use Coss\Core\Json\JsonSerializableType;
use Coss\Types\SendEmailRequest;
use Coss\Core\Json\JsonProperty;
use Coss\Core\Types\ArrayType;

class SendEmailBatchRequest extends JsonSerializableType
{
    /**
     * @var ?string $idempotencyKey Makes retries safe: a repeated request with the same key and body returns the original email (with its current status) instead of sending again, for 24 hours. 1-256 characters.
     */
    public ?string $idempotencyKey;

    /**
     * @var array<SendEmailRequest> $emails Up to 100 emails, each accepted by `POST /v1/emails`. The batch is accepted or rejected as a whole.
     */
    #[JsonProperty('emails'), ArrayType([SendEmailRequest::class])]
    public array $emails;

    /**
     * @param array{
     *   emails: array<SendEmailRequest>,
     *   idempotencyKey?: ?string,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->idempotencyKey = $values['idempotencyKey'] ?? null;
        $this->emails = $values['emails'];
    }
}
