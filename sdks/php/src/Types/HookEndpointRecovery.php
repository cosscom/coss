<?php

namespace Coss\Types;

use Coss\Core\Json\JsonSerializableType;
use Coss\Core\Json\JsonProperty;
use DateTime;
use Coss\Core\Types\Date;

class HookEndpointRecovery extends JsonSerializableType
{
    /**
     * @var value-of<HookEndpointRecoveryObject> $object
     */
    #[JsonProperty('object')]
    public string $object;

    /**
     * @var string $id
     */
    #[JsonProperty('id')]
    public string $id;

    /**
     * @var string $endpointId
     */
    #[JsonProperty('endpoint_id')]
    public string $endpointId;

    /**
     * @var DateTime $since
     */
    #[JsonProperty('since'), Date(Date::TYPE_DATETIME)]
    public DateTime $since;

    /**
     * @var DateTime $until
     */
    #[JsonProperty('until'), Date(Date::TYPE_DATETIME)]
    public DateTime $until;

    /**
     * @var value-of<HookEndpointRecoveryStatus> $status `pending` while coss.com is still requeueing deliveries (in the background).
     */
    #[JsonProperty('status')]
    public string $status;

    /**
     * @var int $requeued Deliveries requeued so far.
     */
    #[JsonProperty('requeued')]
    public int $requeued;

    /**
     * @var DateTime $createdAt
     */
    #[JsonProperty('created_at'), Date(Date::TYPE_DATETIME)]
    public DateTime $createdAt;

    /**
     * @var ?DateTime $completedAt
     */
    #[JsonProperty('completed_at'), Date(Date::TYPE_DATETIME)]
    public ?DateTime $completedAt;

    /**
     * @param array{
     *   object: value-of<HookEndpointRecoveryObject>,
     *   id: string,
     *   endpointId: string,
     *   since: DateTime,
     *   until: DateTime,
     *   status: value-of<HookEndpointRecoveryStatus>,
     *   requeued: int,
     *   createdAt: DateTime,
     *   completedAt?: ?DateTime,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->object = $values['object'];
        $this->id = $values['id'];
        $this->endpointId = $values['endpointId'];
        $this->since = $values['since'];
        $this->until = $values['until'];
        $this->status = $values['status'];
        $this->requeued = $values['requeued'];
        $this->createdAt = $values['createdAt'];
        $this->completedAt = $values['completedAt'] ?? null;
        if (array_key_exists('completedAt', $values)) {
            $this->_setField('completedAt');
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
