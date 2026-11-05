<?php

namespace Coss\Types;

use Coss\Core\Json\JsonSerializableType;
use Coss\Core\Json\JsonProperty;

class SchedulingOutOfOfficeConflict extends JsonSerializableType
{
    /**
     * @var value-of<SchedulingOutOfOfficeConflictObject> $object
     */
    #[JsonProperty('object')]
    public string $object;

    /**
     * @var string $booking
     */
    #[JsonProperty('booking')]
    public string $booking;

    /**
     * @var string $eventType
     */
    #[JsonProperty('event_type')]
    public string $eventType;

    /**
     * @var string $title
     */
    #[JsonProperty('title')]
    public string $title;

    /**
     * @var value-of<SchedulingOutOfOfficeConflictStatus> $status
     */
    #[JsonProperty('status')]
    public string $status;

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
     * @var ?string $series
     */
    #[JsonProperty('series')]
    public ?string $series;

    /**
     * @var ?string $groupSession
     */
    #[JsonProperty('group_session')]
    public ?string $groupSession;

    /**
     * @param array{
     *   object: value-of<SchedulingOutOfOfficeConflictObject>,
     *   booking: string,
     *   eventType: string,
     *   title: string,
     *   status: value-of<SchedulingOutOfOfficeConflictStatus>,
     *   start: string,
     *   end: string,
     *   series?: ?string,
     *   groupSession?: ?string,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->object = $values['object'];
        $this->booking = $values['booking'];
        $this->eventType = $values['eventType'];
        $this->title = $values['title'];
        $this->status = $values['status'];
        $this->start = $values['start'];
        $this->end = $values['end'];
        $this->series = $values['series'] ?? null;
        if (array_key_exists('series', $values)) {
            $this->_setField('series');
        }
        $this->groupSession = $values['groupSession'] ?? null;
        if (array_key_exists('groupSession', $values)) {
            $this->_setField('groupSession');
        }
    }

    /**
     * @return string
     */
    public function __toString(): string
    {
        return $this->toJson();
    }
}
