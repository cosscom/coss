<?php

namespace Coss\Hooks;

use Coss\Hooks\EventTypes\EventTypesClient;
use Coss\Hooks\Applications\ApplicationsClient;
use Coss\Hooks\Endpoints\EndpointsClient;
use Coss\Hooks\Messages\MessagesClient;
use Coss\Hooks\Deliveries\DeliveriesClient;
use Coss\Hooks\Portal\PortalClient;
use Psr\Http\Client\ClientInterface;
use Coss\Core\Client\RawClient;

class HooksClient
{
    /**
     * @var EventTypesClient $eventTypes
     */
    public EventTypesClient $eventTypes;

    /**
     * @var ApplicationsClient $applications
     */
    public ApplicationsClient $applications;

    /**
     * @var EndpointsClient $endpoints
     */
    public EndpointsClient $endpoints;

    /**
     * @var MessagesClient $messages
     */
    public MessagesClient $messages;

    /**
     * @var DeliveriesClient $deliveries
     */
    public DeliveriesClient $deliveries;

    /**
     * @var PortalClient $portal
     */
    public PortalClient $portal;

    /**
     * @var array{
     *   baseUrl?: string,
     *   client?: ClientInterface,
     *   maxRetries?: int,
     *   timeout?: float,
     *   headers?: array<string, string>,
     * } $options @phpstan-ignore-next-line Property is used in endpoint methods via HttpEndpointGenerator
     */
    private array $options;

    /**
     * @var RawClient $client
     */
    private RawClient $client;

    /**
     * @param RawClient $client
     * @param ?array{
     *   baseUrl?: string,
     *   client?: ClientInterface,
     *   maxRetries?: int,
     *   timeout?: float,
     *   headers?: array<string, string>,
     * } $options
     */
    public function __construct(
        RawClient $client,
        ?array $options = null,
    ) {
        $this->client = $client;
        $this->options = $options ?? [];
        $this->eventTypes = new EventTypesClient($this->client, $this->options);
        $this->applications = new ApplicationsClient($this->client, $this->options);
        $this->endpoints = new EndpointsClient($this->client, $this->options);
        $this->messages = new MessagesClient($this->client, $this->options);
        $this->deliveries = new DeliveriesClient($this->client, $this->options);
        $this->portal = new PortalClient($this->client, $this->options);
    }
}
