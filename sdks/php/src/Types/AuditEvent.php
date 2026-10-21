<?php

namespace Coss\Types;

use Coss\Core\Json\JsonSerializableType;
use Coss\Core\Json\JsonProperty;
use DateTime;
use Coss\Core\Types\Date;
use Coss\Core\Types\ArrayType;

class AuditEvent extends JsonSerializableType
{
    /**
     * @var value-of<AuditEventObject> $object
     */
    #[JsonProperty('object')]
    public string $object;

    /**
     * @var string $id
     */
    #[JsonProperty('id')]
    public string $id;

    /**
     * @var DateTime $createdAt
     */
    #[JsonProperty('created_at'), Date(Date::TYPE_DATETIME)]
    public DateTime $createdAt;

    /**
     * @var value-of<AuditActorType> $actorType
     */
    #[JsonProperty('actor_type')]
    public string $actorType;

    /**
     * @var ?string $actorId The user's or API key's id; `null` for the system.
     */
    #[JsonProperty('actor_id')]
    public ?string $actorId;

    /**
     * @var string $actorLabel Who made the change, copied when it was recorded so it outlives them: the user's email, the API key's id, or `coss.com support`.
     */
    #[JsonProperty('actor_label')]
    public string $actorLabel;

    /**
     * @var string $action `<resource>.<verb>`, e.g. `api_key.created`, `domain.deleted`, `member.role_changed`.
     */
    #[JsonProperty('action')]
    public string $action;

    /**
     * @var ?string $targetType What was changed: `domain`, `api_key`, `member`…
     */
    #[JsonProperty('target_type')]
    public ?string $targetType;

    /**
     * @var ?string $targetId
     */
    #[JsonProperty('target_id')]
    public ?string $targetId;

    /**
     * @var ?string $targetLabel A readable name for the target when it was changed.
     */
    #[JsonProperty('target_label')]
    public ?string $targetLabel;

    /**
     * @var ?string $projectId `null` for organization-wide changes (domains, members…).
     */
    #[JsonProperty('project_id')]
    public ?string $projectId;

    /**
     * @var ?string $environmentId `null` for organization-wide changes (domains, members…).
     */
    #[JsonProperty('environment_id')]
    public ?string $environmentId;

    /**
     * @var array<string, mixed> $metadata Details of the change; API changes include their `request_id`.
     */
    #[JsonProperty('metadata'), ArrayType(['string' => 'mixed'])]
    public array $metadata;

    /**
     * @var ?string $clientIp
     */
    #[JsonProperty('client_ip')]
    public ?string $clientIp;

    /**
     * @var ?string $userAgent
     */
    #[JsonProperty('user_agent')]
    public ?string $userAgent;

    /**
     * @param array{
     *   object: value-of<AuditEventObject>,
     *   id: string,
     *   createdAt: DateTime,
     *   actorType: value-of<AuditActorType>,
     *   actorLabel: string,
     *   action: string,
     *   metadata: array<string, mixed>,
     *   actorId?: ?string,
     *   targetType?: ?string,
     *   targetId?: ?string,
     *   targetLabel?: ?string,
     *   projectId?: ?string,
     *   environmentId?: ?string,
     *   clientIp?: ?string,
     *   userAgent?: ?string,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->object = $values['object'];
        $this->id = $values['id'];
        $this->createdAt = $values['createdAt'];
        $this->actorType = $values['actorType'];
        $this->actorId = $values['actorId'] ?? null;
        $this->actorLabel = $values['actorLabel'];
        $this->action = $values['action'];
        $this->targetType = $values['targetType'] ?? null;
        $this->targetId = $values['targetId'] ?? null;
        $this->targetLabel = $values['targetLabel'] ?? null;
        $this->projectId = $values['projectId'] ?? null;
        $this->environmentId = $values['environmentId'] ?? null;
        $this->metadata = $values['metadata'];
        $this->clientIp = $values['clientIp'] ?? null;
        $this->userAgent = $values['userAgent'] ?? null;
    }

    /**
     * @return string
     */
    public function __toString(): string
    {
        return $this->toJson();
    }
}
