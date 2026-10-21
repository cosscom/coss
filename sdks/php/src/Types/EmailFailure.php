<?php

namespace Coss\Types;

use Coss\Core\Json\JsonSerializableType;
use Coss\Core\Json\JsonProperty;

class EmailFailure extends JsonSerializableType
{
    /**
     * @var string $code Why the email failed, e.g. `all_recipients_suppressed`, `domain_not_verified`, `content_rejected`, `attachments_unavailable`, `dispatch_failed` or `provider_error`.
     */
    #[JsonProperty('code')]
    public string $code;

    /**
     * @var string $message
     */
    #[JsonProperty('message')]
    public string $message;

    /**
     * @param array{
     *   code: string,
     *   message: string,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->code = $values['code'];
        $this->message = $values['message'];
    }

    /**
     * @return string
     */
    public function __toString(): string
    {
        return $this->toJson();
    }
}
