<?php

namespace Coss\Types;

use Coss\Core\Json\JsonSerializableType;
use Coss\Core\Json\JsonProperty;

class EmailEventData extends JsonSerializableType
{
    /**
     * @var ?EmailEventDataBounce $bounce
     */
    #[JsonProperty('bounce')]
    public ?EmailEventDataBounce $bounce;

    /**
     * @var ?EmailEventDataComplaint $complaint
     */
    #[JsonProperty('complaint')]
    public ?EmailEventDataComplaint $complaint;

    /**
     * @var ?EmailEventDataDelay $delay
     */
    #[JsonProperty('delay')]
    public ?EmailEventDataDelay $delay;

    /**
     * @var ?EmailEventDataDelivery $delivery
     */
    #[JsonProperty('delivery')]
    public ?EmailEventDataDelivery $delivery;

    /**
     * @var ?EmailEventDataFailure $failure
     */
    #[JsonProperty('failure')]
    public ?EmailEventDataFailure $failure;

    /**
     * @var ?EmailEventDataSuppression $suppression Only for `email.suppressed`: the entry that matched the recipient.
     */
    #[JsonProperty('suppression')]
    public ?EmailEventDataSuppression $suppression;

    /**
     * @var ?EmailEventDataUnsubscribe $unsubscribe Only for `email.suppressed` without `suppression`: the recipient is a contact who unsubscribed (from marketing, or from the email's topic, `topic`).
     */
    #[JsonProperty('unsubscribe')]
    public ?EmailEventDataUnsubscribe $unsubscribe;

    /**
     * @var ?EmailEventDataOpen $open Only for `email.opened`.
     */
    #[JsonProperty('open')]
    public ?EmailEventDataOpen $open;

    /**
     * @var ?EmailEventDataClick $click Only for `email.clicked`.
     */
    #[JsonProperty('click')]
    public ?EmailEventDataClick $click;

    /**
     * @var ?EmailEventDataReschedule $reschedule Only for `email.rescheduled`.
     */
    #[JsonProperty('reschedule')]
    public ?EmailEventDataReschedule $reschedule;

    /**
     * @param array{
     *   bounce?: ?EmailEventDataBounce,
     *   complaint?: ?EmailEventDataComplaint,
     *   delay?: ?EmailEventDataDelay,
     *   delivery?: ?EmailEventDataDelivery,
     *   failure?: ?EmailEventDataFailure,
     *   suppression?: ?EmailEventDataSuppression,
     *   unsubscribe?: ?EmailEventDataUnsubscribe,
     *   open?: ?EmailEventDataOpen,
     *   click?: ?EmailEventDataClick,
     *   reschedule?: ?EmailEventDataReschedule,
     * } $values
     */
    public function __construct(
        array $values = [],
    ) {
        $this->bounce = $values['bounce'] ?? null;
        $this->complaint = $values['complaint'] ?? null;
        $this->delay = $values['delay'] ?? null;
        $this->delivery = $values['delivery'] ?? null;
        $this->failure = $values['failure'] ?? null;
        $this->suppression = $values['suppression'] ?? null;
        $this->unsubscribe = $values['unsubscribe'] ?? null;
        $this->open = $values['open'] ?? null;
        $this->click = $values['click'] ?? null;
        $this->reschedule = $values['reschedule'] ?? null;
    }

    /**
     * @return string
     */
    public function __toString(): string
    {
        return $this->toJson();
    }
}
