<?php

namespace Coss\Types;

use Coss\Core\Json\JsonSerializableType;
use Coss\Core\Json\JsonProperty;

class SchedulingOutOfOfficeWebhookEventData extends JsonSerializableType
{
    /**
     * @var string $outOfOfficeId
     */
    #[JsonProperty('out_of_office_id')]
    public string $outOfOfficeId;

    /**
     * @var string $hostId
     */
    #[JsonProperty('host_id')]
    public string $hostId;

    /**
     * @var string $start
     */
    #[JsonProperty('start')]
    public string $start;

    /**
     * @var string $end
     */
    #[JsonProperty('end')]
    public string $end;

    /**
     * @var ?string $group
     */
    #[JsonProperty('group')]
    public ?string $group;

    /**
     * @var string $occurredAt
     */
    #[JsonProperty('occurred_at')]
    public string $occurredAt;

    /**
     * @param array{
     *   outOfOfficeId: string,
     *   hostId: string,
     *   start: string,
     *   end: string,
     *   occurredAt: string,
     *   group?: ?string,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->outOfOfficeId = $values['outOfOfficeId'];
        $this->hostId = $values['hostId'];
        $this->start = $values['start'];
        $this->end = $values['end'];
        $this->group = $values['group'] ?? null;
        if (array_key_exists('group', $values)) {
            $this->_setField('group');
        }
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
