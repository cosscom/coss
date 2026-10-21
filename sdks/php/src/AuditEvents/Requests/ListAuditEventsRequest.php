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
        $this->actorType = $values['actorType'] ?? null;
        $this->actorId = $values['actorId'] ?? null;
        $this->targetId = $values['targetId'] ?? null;
        $this->environmentId = $values['environmentId'] ?? null;
        $this->from = $values['from'] ?? null;
        $this->to = $values['to'] ?? null;
        $this->limit = $values['limit'] ?? null;
        $this->after = $values['after'] ?? null;
    }
}
