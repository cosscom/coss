<?php

namespace Coss\WebhookListeners\Requests;

use Coss\Core\Json\JsonSerializableType;
use Coss\WebhookListeners\Types\CreateWebhookListenerRequestEventTypesItem;
use Coss\Core\Json\JsonProperty;
use Coss\Core\Types\ArrayType;
use Coss\WebhookListeners\Types\CreateWebhookListenerRequestApiVersion;

class CreateWebhookListenerRequest extends JsonSerializableType
{
    /**
     * @var ?array<value-of<CreateWebhookListenerRequestEventTypesItem>> $eventTypes Event types to receive. Defaults to every event type.
     */
    #[JsonProperty('event_types'), ArrayType(['string'])]
    public ?array $eventTypes;

    /**
     * @var ?value-of<CreateWebhookListenerRequestApiVersion> $apiVersion The API version events are rendered in. Defaults to the version of the request that creates the listener.
     */
    #[JsonProperty('api_version')]
    public ?string $apiVersion;

    /**
     * @var ?string $description Where the events go, for your own reference (shown in the log).
     */
    #[JsonProperty('description')]
    public ?string $description;

    /**
     * @param array{
     *   eventTypes?: ?array<value-of<CreateWebhookListenerRequestEventTypesItem>>,
     *   apiVersion?: ?value-of<CreateWebhookListenerRequestApiVersion>,
     *   description?: ?string,
     * } $values
     */
    public function __construct(
        array $values = [],
    ) {
        $this->eventTypes = $values['eventTypes'] ?? null;
        if (array_key_exists('eventTypes', $values)) {
            $this->_setField('eventTypes');
        }
        $this->apiVersion = $values['apiVersion'] ?? null;
        if (array_key_exists('apiVersion', $values)) {
            $this->_setField('apiVersion');
        }
        $this->description = $values['description'] ?? null;
        if (array_key_exists('description', $values)) {
            $this->_setField('description');
        }
    }
}
