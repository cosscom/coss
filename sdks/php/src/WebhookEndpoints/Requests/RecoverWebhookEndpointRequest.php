<?php

namespace Coss\WebhookEndpoints\Requests;

use Coss\Core\Json\JsonSerializableType;
use DateTime;
use Coss\Core\Json\JsonProperty;
use Coss\Core\Types\Date;

class RecoverWebhookEndpointRequest extends JsonSerializableType
{
    /**
     * @var DateTime $since Requeue the endpoint's deliveries that failed and were created at or after this time (ISO 8601). Deliveries are kept for 30 days.
     */
    #[JsonProperty('since'), Date(Date::TYPE_DATETIME)]
    public DateTime $since;

    /**
     * @param array{
     *   since: DateTime,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->since = $values['since'];
    }
}
