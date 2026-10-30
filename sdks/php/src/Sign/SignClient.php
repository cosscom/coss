<?php

namespace Coss\Sign;

use Coss\Sign\Documents\DocumentsClient;
use Coss\Sign\Requests\RequestsClient;
use Coss\Sign\Sessions\SessionsClient;
use Coss\Sign\Settings\SettingsClient;
use Coss\Sign\Templates\TemplatesClient;
use Psr\Http\Client\ClientInterface;
use Coss\Core\Client\RawClient;

class SignClient
{
    /**
     * @var DocumentsClient $documents
     */
    public DocumentsClient $documents;

    /**
     * @var RequestsClient $requests
     */
    public RequestsClient $requests;

    /**
     * @var SessionsClient $sessions
     */
    public SessionsClient $sessions;

    /**
     * @var SettingsClient $settings
     */
    public SettingsClient $settings;

    /**
     * @var TemplatesClient $templates
     */
    public TemplatesClient $templates;

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
        $this->documents = new DocumentsClient($this->client, $this->options);
        $this->requests = new RequestsClient($this->client, $this->options);
        $this->sessions = new SessionsClient($this->client, $this->options);
        $this->settings = new SettingsClient($this->client, $this->options);
        $this->templates = new TemplatesClient($this->client, $this->options);
    }
}
