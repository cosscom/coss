<?php

namespace Coss\WebhookEndpoints\Requests;

use Coss\Core\Json\JsonSerializableType;
use Coss\Core\Json\JsonProperty;
use Coss\WebhookEndpoints\Types\UpdateWebhookEndpointRequestEventTypesItem;
use Coss\Core\Types\ArrayType;
use Coss\WebhookEndpoints\Types\UpdateWebhookEndpointRequestApiVersion;

class UpdateWebhookEndpointRequest extends JsonSerializableType
{
    /**
     * @var ?string $url An `https://` URL coss.com posts events to.
     */
    #[JsonProperty('url')]
    public ?string $url;

    /**
     * @var ?string $description A note for your own reference. `null` clears it.
     */
    #[JsonProperty('description')]
    public ?string $description;

    /**
     * @var ?array<value-of<UpdateWebhookEndpointRequestEventTypesItem>> $eventTypes Event types delivered to this endpoint. An empty array means every event type, including ones added later.
     */
    #[JsonProperty('event_types'), ArrayType(['string'])]
    public ?array $eventTypes;

    /**
     * @var ?value-of<UpdateWebhookEndpointRequestApiVersion> $apiVersion The API version (`Coss-Version`) events are rendered in for this endpoint. Each event carries it as `api_version`.
     */
    #[JsonProperty('api_version')]
    public ?string $apiVersion;

    /**
     * @var ?bool $enabled
     */
    #[JsonProperty('enabled')]
    public ?bool $enabled;

    /**
     * @param array{
     *   url?: ?string,
     *   description?: ?string,
     *   eventTypes?: ?array<value-of<UpdateWebhookEndpointRequestEventTypesItem>>,
     *   apiVersion?: ?value-of<UpdateWebhookEndpointRequestApiVersion>,
     *   enabled?: ?bool,
     * } $values
     */
    public function __construct(
        array $values = [],
    ) {
        $this->url = $values['url'] ?? null;
        $this->description = $values['description'] ?? null;
        $this->eventTypes = $values['eventTypes'] ?? null;
        $this->apiVersion = $values['apiVersion'] ?? null;
        $this->enabled = $values['enabled'] ?? null;
    }
}
