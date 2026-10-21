<?php

namespace Coss\Types;

use Coss\Core\Json\JsonSerializableType;
use Coss\Core\Json\JsonProperty;
use DateTime;
use Coss\Core\Types\Date;

class HookEndpointWebhookEventData extends JsonSerializableType
{
    /**
     * @var string $applicationId
     */
    #[JsonProperty('application_id')]
    public string $applicationId;

    /**
     * @var ?string $applicationUid
     */
    #[JsonProperty('application_uid')]
    public ?string $applicationUid;

    /**
     * @var string $endpointId
     */
    #[JsonProperty('endpoint_id')]
    public string $endpointId;

    /**
     * @var string $url
     */
    #[JsonProperty('url')]
    public string $url;

    /**
     * @var DateTime $failingSince
     */
    #[JsonProperty('failing_since'), Date(Date::TYPE_DATETIME)]
    public DateTime $failingSince;

    /**
     * @var DateTime $occurredAt
     */
    #[JsonProperty('occurred_at'), Date(Date::TYPE_DATETIME)]
    public DateTime $occurredAt;

    /**
     * @param array{
     *   applicationId: string,
     *   endpointId: string,
     *   url: string,
     *   failingSince: DateTime,
     *   occurredAt: DateTime,
     *   applicationUid?: ?string,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->applicationId = $values['applicationId'];
        $this->applicationUid = $values['applicationUid'] ?? null;
        if (array_key_exists('applicationUid', $values)) {
            $this->_setField('applicationUid');
        }
        $this->endpointId = $values['endpointId'];
        $this->url = $values['url'];
        $this->failingSince = $values['failingSince'];
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
