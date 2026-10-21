<?php

namespace Coss\Types;

use Coss\Core\Json\JsonSerializableType;
use Coss\Core\Json\JsonProperty;
use DateTime;
use Coss\Core\Types\Date;

class EmailWebhookEventDataDelay extends JsonSerializableType
{
    /**
     * @var string $type
     */
    #[JsonProperty('type')]
    public string $type;

    /**
     * @var ?DateTime $expiresAt
     */
    #[JsonProperty('expires_at'), Date(Date::TYPE_DATETIME)]
    public ?DateTime $expiresAt;

    /**
     * @var ?string $diagnosticCode
     */
    #[JsonProperty('diagnostic_code')]
    public ?string $diagnosticCode;

    /**
     * @param array{
     *   type: string,
     *   expiresAt?: ?DateTime,
     *   diagnosticCode?: ?string,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->type = $values['type'];
        $this->expiresAt = $values['expiresAt'] ?? null;
        $this->diagnosticCode = $values['diagnosticCode'] ?? null;
    }

    /**
     * @return string
     */
    public function __toString(): string
    {
        return $this->toJson();
    }
}
