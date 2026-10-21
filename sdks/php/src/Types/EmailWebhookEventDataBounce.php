<?php

namespace Coss\Types;

use Coss\Core\Json\JsonSerializableType;
use Coss\Core\Json\JsonProperty;

class EmailWebhookEventDataBounce extends JsonSerializableType
{
    /**
     * @var value-of<EmailWebhookEventDataBounceType> $type
     */
    #[JsonProperty('type')]
    public string $type;

    /**
     * @var string $subType
     */
    #[JsonProperty('sub_type')]
    public string $subType;

    /**
     * @var ?string $diagnosticCode
     */
    #[JsonProperty('diagnostic_code')]
    public ?string $diagnosticCode;

    /**
     * @param array{
     *   type: value-of<EmailWebhookEventDataBounceType>,
     *   subType: string,
     *   diagnosticCode?: ?string,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->type = $values['type'];
        $this->subType = $values['subType'];
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
