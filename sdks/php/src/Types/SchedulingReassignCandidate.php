<?php

namespace Coss\Types;

use Coss\Core\Json\JsonSerializableType;
use Coss\Core\Json\JsonProperty;
use Coss\Core\Types\ArrayType;

class SchedulingReassignCandidate extends JsonSerializableType
{
    /**
     * @var value-of<SchedulingReassignCandidateObject> $object
     */
    #[JsonProperty('object')]
    public string $object;

    /**
     * @var string $host
     */
    #[JsonProperty('host')]
    public string $host;

    /**
     * @var ?string $uid
     */
    #[JsonProperty('uid')]
    public ?string $uid;

    /**
     * @var string $name
     */
    #[JsonProperty('name')]
    public string $name;

    /**
     * @var bool $member Takes this event type, and fits what the booking was routed with. Otherwise it needs `any_host`.
     */
    #[JsonProperty('member')]
    public bool $member;

    /**
     * @var bool $available
     */
    #[JsonProperty('available')]
    public bool $available;

    /**
     * @var ?string $reason Why they aren't available, the first of `reasons`.
     */
    #[JsonProperty('reason')]
    public ?string $reason;

    /**
     * @var array<string> $reasons Everything in the way, each needing its override. `already_claimed` can't be overridden.
     */
    #[JsonProperty('reasons'), ArrayType(['string'])]
    public array $reasons;

    /**
     * @var float $load Their live bookings in the week from this one.
     */
    #[JsonProperty('load')]
    public float $load;

    /**
     * @var ?float $rank Their place in who a pool would pick next, from 1. Null for a non-member.
     */
    #[JsonProperty('rank')]
    public ?float $rank;

    /**
     * @var bool $meetingProviderMissing They haven't connected what this booking's meeting needs, so it'd have none.
     */
    #[JsonProperty('meeting_provider_missing')]
    public bool $meetingProviderMissing;

    /**
     * @param array{
     *   object: value-of<SchedulingReassignCandidateObject>,
     *   host: string,
     *   name: string,
     *   member: bool,
     *   available: bool,
     *   reasons: array<string>,
     *   load: float,
     *   meetingProviderMissing: bool,
     *   uid?: ?string,
     *   reason?: ?string,
     *   rank?: ?float,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->object = $values['object'];
        $this->host = $values['host'];
        $this->uid = $values['uid'] ?? null;
        if (array_key_exists('uid', $values)) {
            $this->_setField('uid');
        }
        $this->name = $values['name'];
        $this->member = $values['member'];
        $this->available = $values['available'];
        $this->reason = $values['reason'] ?? null;
        if (array_key_exists('reason', $values)) {
            $this->_setField('reason');
        }
        $this->reasons = $values['reasons'];
        $this->load = $values['load'];
        $this->rank = $values['rank'] ?? null;
        if (array_key_exists('rank', $values)) {
            $this->_setField('rank');
        }
        $this->meetingProviderMissing = $values['meetingProviderMissing'];
    }

    /**
     * @return string
     */
    public function __toString(): string
    {
        return $this->toJson();
    }
}
