<?php

namespace Coss\Hooks\Endpoints\Requests;

use Coss\Core\Json\JsonSerializableType;
use DateTime;
use Coss\Core\Json\JsonProperty;
use Coss\Core\Types\Date;

class RecoverHookEndpointRequest extends JsonSerializableType
{
    /**
     * @var DateTime $since Requeue deliveries that failed, of messages sent from this time until now.
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
