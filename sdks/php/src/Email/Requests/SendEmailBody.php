<?php

namespace Coss\Email\Requests;

use Coss\Core\Json\JsonSerializableType;
use Coss\Types\SendEmailRequest;

class SendEmailBody extends JsonSerializableType
{
    /**
     * @var ?string $idempotencyKey Makes retries safe: a repeated request with the same key and body returns the original email (with its current status) instead of sending again, for 24 hours. 1-256 characters.
     */
    public ?string $idempotencyKey;

    /**
     * @var SendEmailRequest $body
     */
    public SendEmailRequest $body;

    /**
     * @param array{
     *   body: SendEmailRequest,
     *   idempotencyKey?: ?string,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->idempotencyKey = $values['idempotencyKey'] ?? null;
        $this->body = $values['body'];
    }
}
