<?php

namespace Coss\Types;

use Coss\Core\Json\JsonSerializableType;
use Coss\Core\Json\JsonProperty;

class DmarcReportRecordAuthResultsDkimItem extends JsonSerializableType
{
    /**
     * @var string $domain
     */
    #[JsonProperty('domain')]
    public string $domain;

    /**
     * @var ?string $selector
     */
    #[JsonProperty('selector')]
    public ?string $selector;

    /**
     * @var string $result
     */
    #[JsonProperty('result')]
    public string $result;

    /**
     * @param array{
     *   domain: string,
     *   result: string,
     *   selector?: ?string,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->domain = $values['domain'];
        $this->selector = $values['selector'] ?? null;
        $this->result = $values['result'];
    }

    /**
     * @return string
     */
    public function __toString(): string
    {
        return $this->toJson();
    }
}
