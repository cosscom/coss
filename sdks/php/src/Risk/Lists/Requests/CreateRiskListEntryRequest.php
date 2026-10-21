<?php

namespace Coss\Risk\Lists\Requests;

use Coss\Core\Json\JsonSerializableType;
use Coss\Types\RiskList;
use Coss\Core\Json\JsonProperty;
use Coss\Types\RiskListEntryType;
use DateTime;
use Coss\Core\Types\Date;

class CreateRiskListEntryRequest extends JsonSerializableType
{
    /**
     * @var value-of<RiskList> $list
     */
    #[JsonProperty('list')]
    public string $list;

    /**
     * @var value-of<RiskListEntryType> $type
     */
    #[JsonProperty('type')]
    public string $type;

    /**
     * @var string $value
     */
    #[JsonProperty('value')]
    public string $value;

    /**
     * @var ?string $note
     */
    #[JsonProperty('note')]
    public ?string $note;

    /**
     * @var ?DateTime $expiresAt The entry stops matching at this time (it is kept until deleted).
     */
    #[JsonProperty('expires_at'), Date(Date::TYPE_DATETIME)]
    public ?DateTime $expiresAt;

    /**
     * @param array{
     *   list: value-of<RiskList>,
     *   type: value-of<RiskListEntryType>,
     *   value: string,
     *   note?: ?string,
     *   expiresAt?: ?DateTime,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->list = $values['list'];
        $this->type = $values['type'];
        $this->value = $values['value'];
        $this->note = $values['note'] ?? null;
        $this->expiresAt = $values['expiresAt'] ?? null;
    }
}
