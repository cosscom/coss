<?php

namespace Coss\Types;

use Coss\Core\Json\JsonSerializableType;
use Coss\Core\Json\JsonProperty;

class DmarcReportRecordReasonsItem extends JsonSerializableType
{
    /**
     * @var string $type
     */
    #[JsonProperty('type')]
    public string $type;

    /**
     * @var ?string $comment
     */
    #[JsonProperty('comment')]
    public ?string $comment;

    /**
     * @param array{
     *   type: string,
     *   comment?: ?string,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->type = $values['type'];
        $this->comment = $values['comment'] ?? null;
    }

    /**
     * @return string
     */
    public function __toString(): string
    {
        return $this->toJson();
    }
}
