<?php

namespace Coss\Types;

use Coss\Core\Json\JsonSerializableType;
use Coss\Core\Json\JsonProperty;

class SchedulingReassignmentItem extends JsonSerializableType
{
    /**
     * @var value-of<SchedulingReassignmentItemObject> $object
     */
    #[JsonProperty('object')]
    public string $object;

    /**
     * @var string $id
     */
    #[JsonProperty('id')]
    public string $id;

    /**
     * @var string $booking
     */
    #[JsonProperty('booking')]
    public string $booking;

    /**
     * @var ?string $fromHost
     */
    #[JsonProperty('from_host')]
    public ?string $fromHost;

    /**
     * @var ?string $toHost
     */
    #[JsonProperty('to_host')]
    public ?string $toHost;

    /**
     * @var value-of<SchedulingReassignmentItemOutcome> $outcome
     */
    #[JsonProperty('outcome')]
    public string $outcome;

    /**
     * @var ?string $errorCode
     */
    #[JsonProperty('error_code')]
    public ?string $errorCode;

    /**
     * @param array{
     *   object: value-of<SchedulingReassignmentItemObject>,
     *   id: string,
     *   booking: string,
     *   outcome: value-of<SchedulingReassignmentItemOutcome>,
     *   fromHost?: ?string,
     *   toHost?: ?string,
     *   errorCode?: ?string,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->object = $values['object'];
        $this->id = $values['id'];
        $this->booking = $values['booking'];
        $this->fromHost = $values['fromHost'] ?? null;
        if (array_key_exists('fromHost', $values)) {
            $this->_setField('fromHost');
        }
        $this->toHost = $values['toHost'] ?? null;
        if (array_key_exists('toHost', $values)) {
            $this->_setField('toHost');
        }
        $this->outcome = $values['outcome'];
        $this->errorCode = $values['errorCode'] ?? null;
        if (array_key_exists('errorCode', $values)) {
            $this->_setField('errorCode');
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
