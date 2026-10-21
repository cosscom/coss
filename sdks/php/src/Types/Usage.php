<?php

namespace Coss\Types;

use Coss\Core\Json\JsonSerializableType;
use Coss\Core\Json\JsonProperty;
use DateTime;
use Coss\Core\Types\Date;

class Usage extends JsonSerializableType
{
    /**
     * @var value-of<UsageObject> $object
     */
    #[JsonProperty('object')]
    public string $object;

    /**
     * @var value-of<UsageMeter> $meter What is counted, e.g. `email.recipients`.
     */
    #[JsonProperty('meter')]
    public string $meter;

    /**
     * @var ?string $dimension e.g. `country=US` for SMS; `null` for none.
     */
    #[JsonProperty('dimension')]
    public ?string $dimension;

    /**
     * @var ?string $environmentId Set with `group_by=environment`.
     */
    #[JsonProperty('environment_id')]
    public ?string $environmentId;

    /**
     * @var DateTime $start
     */
    #[JsonProperty('start'), Date(Date::TYPE_DATETIME)]
    public DateTime $start;

    /**
     * @var DateTime $end
     */
    #[JsonProperty('end'), Date(Date::TYPE_DATETIME)]
    public DateTime $end;

    /**
     * @var int $quantity
     */
    #[JsonProperty('quantity')]
    public int $quantity;

    /**
     * @param array{
     *   object: value-of<UsageObject>,
     *   meter: value-of<UsageMeter>,
     *   start: DateTime,
     *   end: DateTime,
     *   quantity: int,
     *   dimension?: ?string,
     *   environmentId?: ?string,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->object = $values['object'];
        $this->meter = $values['meter'];
        $this->dimension = $values['dimension'] ?? null;
        $this->environmentId = $values['environmentId'] ?? null;
        $this->start = $values['start'];
        $this->end = $values['end'];
        $this->quantity = $values['quantity'];
    }

    /**
     * @return string
     */
    public function __toString(): string
    {
        return $this->toJson();
    }
}
