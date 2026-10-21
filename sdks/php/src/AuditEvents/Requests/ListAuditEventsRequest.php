<?php

namespace Coss\AuditEvents\Requests;

use Coss\Core\Json\JsonSerializableType;
use DateTime;

class ListAuditEventsRequest extends JsonSerializableType
{
    /**
     * @var ?string $action Only these actions, comma-separated. An entry ending in `.` matches every action of that resource: `domain.,api_key.created`.
     */
    public ?string $action;

    /**
     * @var ?string $actorType Only these actor types, e.g. `user,api_key`.
     */
    public ?string $actorType;

    /**
     * @var ?string $actorId Only changes made by this user or API key.
     */
    public ?string $actorId;

    /**
     * @var ?string $targetId Only changes to this resource, e.g. a `dom_…` id.
     */
    public ?string $targetId;

    /**
     * @var ?string $environmentId Only changes in this environment.
     */
    public ?string $environmentId;

    /**
     * @var ?DateTime $from Only events at or after this time.
     */
    public ?DateTime $from;

    /**
     * @var ?DateTime $to Only events before this time.
     */
    public ?DateTime $to;

    /**
     * @var ?int $limit 1-100, default 50.
     */
    public ?int $limit;

    /**
     * @var ?string $after Cursor: the `id` of the last event of the previous page.
     */
    public ?string $after;

    /**
     * @param array{
     *   action?: ?string,
     *   actorType?: ?string,
     *   actorId?: ?string,
     *   targetId?: ?string,
     *   environmentId?: ?string,
     *   from?: ?DateTime,
     *   to?: ?DateTime,
     *   limit?: ?int,
     *   after?: ?string,
     * } $values
     */
    public function __construct(
        array $values = [],
    ) {
        $this->action = $values['action'] ?? null;
        if (array_key_exists('action', $values)) {
            $this->_setField('action');
        }
        $this->actorType = $values['actorType'] ?? null;
        if (array_key_exists('actorType', $values)) {
            $this->_setField('actorType');
        }
        $this->actorId = $values['actorId'] ?? null;
        if (array_key_exists('actorId', $values)) {
            $this->_setField('actorId');
        }
        $this->targetId = $values['targetId'] ?? null;
        if (array_key_exists('targetId', $values)) {
            $this->_setField('targetId');
        }
        $this->environmentId = $values['environmentId'] ?? null;
        if (array_key_exists('environmentId', $values)) {
            $this->_setField('environmentId');
        }
        $this->from = $values['from'] ?? null;
        if (array_key_exists('from', $values)) {
            $this->_setField('from');
        }
        $this->to = $values['to'] ?? null;
        if (array_key_exists('to', $values)) {
            $this->_setField('to');
        }
        $this->limit = $values['limit'] ?? null;
        if (array_key_exists('limit', $values)) {
            $this->_setField('limit');
        }
        $this->after = $values['after'] ?? null;
        if (array_key_exists('after', $values)) {
            $this->_setField('after');
        }
    }
}
