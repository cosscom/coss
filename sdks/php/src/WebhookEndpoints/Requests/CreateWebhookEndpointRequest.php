<?php

namespace Coss\WebhookEndpoints\Requests;

use Coss\Core\Json\JsonSerializableType;
use Coss\Core\Json\JsonProperty;
use Coss\WebhookEndpoints\Types\CreateWebhookEndpointRequestEventTypesItem;
use Coss\Core\Types\ArrayType;
use Coss\WebhookEndpoints\Types\CreateWebhookEndpointRequestApiVersion;

class CreateWebhookEndpointRequest extends JsonSerializableType
{
    /**
     * @var string $url An `https://` URL coss.com posts events to.
     */
    #[JsonProperty('url')]
    public string $url;

    /**
     * @var ?string $description A note for your own reference. `null` clears it.
     */
    #[JsonProperty('description')]
    public ?string $description;

    /**
     * @var ?array<value-of<CreateWebhookEndpointRequestEventTypesItem>> $eventTypes Event types delivered to this endpoint. An empty array means every event type, including ones added later. Defaults to every event type.
     */
    #[JsonProperty('event_types'), ArrayType(['string'])]
    public ?array $eventTypes;

    /**
     * @var ?value-of<CreateWebhookEndpointRequestApiVersion> $apiVersion The API version (`Coss-Version`) events are rendered in for this endpoint. Each event carries it as `api_version`. Defaults to the version of the request that creates the endpoint.
     */
    #[JsonProperty('api_version')]
    public ?string $apiVersion;

    /**
     * @param array{
     *   url: string,
     *   description?: ?string,
     *   eventTypes?: ?array<value-of<CreateWebhookEndpointRequestEventTypesItem>>,
     *   apiVersion?: ?value-of<CreateWebhookEndpointRequestApiVersion>,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->url = $values['url'];
        $this->description = $values['description'] ?? null;
        $this->eventTypes = $values['eventTypes'] ?? null;
        $this->apiVersion = $values['apiVersion'] ?? null;
    }
}
