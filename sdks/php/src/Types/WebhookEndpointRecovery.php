<?php

namespace Coss\Types;

use Coss\Core\Json\JsonSerializableType;
use Coss\Core\Json\JsonProperty;

class WebhookEndpointRecovery extends JsonSerializableType
{
    /**
     * @var value-of<WebhookEndpointRecoveryObject> $object
     */
    #[JsonProperty('object')]
    public string $object;

    /**
     * @var string $endpointId
     */
    #[JsonProperty('endpoint_id')]
    public string $endpointId;

    /**
     * @var int $requeued How many failed deliveries were queued for one more attempt. Their attempts are spread over the next minute.
     */
    #[JsonProperty('requeued')]
    public int $requeued;

    /**
     * @var bool $hasMore At most 1,000 are requeued per call; `true` means call again with the same `since`.
     */
    #[JsonProperty('has_more')]
    public bool $hasMore;

    /**
     * @param array{
     *   object: value-of<WebhookEndpointRecoveryObject>,
     *   endpointId: string,
     *   requeued: int,
     *   hasMore: bool,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->object = $values['object'];
        $this->endpointId = $values['endpointId'];
        $this->requeued = $values['requeued'];
        $this->hasMore = $values['hasMore'];
    }

    /**
     * @return string
     */
    public function __toString(): string
    {
        return $this->toJson();
    }
}
