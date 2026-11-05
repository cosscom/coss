<?php

namespace Coss\Types;

use Coss\Core\Json\JsonSerializableType;
use Coss\Core\Json\JsonProperty;

class SchedulingReassignmentPreviewItemsItem extends JsonSerializableType
{
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
     * @var value-of<SchedulingReassignmentPreviewItemsItemStatus> $status
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
     * @var ?string $fromHost
     */
    #[JsonProperty('from_host')]
    public ?string $fromHost;

    /**
     * @var ?string $toHost Null when nobody could take it.
     */
    #[JsonProperty('to_host')]
    public ?string $toHost;

    /**
     * @var ?string $reason Why it would stay where it is.
     */
    #[JsonProperty('reason')]
    public ?string $reason;

    /**
     * @param array{
     *   booking: string,
     *   eventType: string,
     *   title: string,
     *   status: value-of<SchedulingReassignmentPreviewItemsItemStatus>,
     *   start: string,
     *   end: string,
     *   series?: ?string,
     *   groupSession?: ?string,
     *   fromHost?: ?string,
     *   toHost?: ?string,
     *   reason?: ?string,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
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
        $this->fromHost = $values['fromHost'] ?? null;
        if (array_key_exists('fromHost', $values)) {
            $this->_setField('fromHost');
        }
        $this->toHost = $values['toHost'] ?? null;
        if (array_key_exists('toHost', $values)) {
            $this->_setField('toHost');
        }
        $this->reason = $values['reason'] ?? null;
        if (array_key_exists('reason', $values)) {
            $this->_setField('reason');
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
