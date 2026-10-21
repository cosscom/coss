<?php

namespace Coss;

use Coss\Environment\EnvironmentClient;
use Coss\ApiKey\ApiKeyClient;
use Coss\Email\EmailClient;
use Coss\Domains\DomainsClient;
use Coss\WebhookEndpoints\WebhookEndpointsClient;
use Coss\WebhookListeners\WebhookListenersClient;
use Coss\Reputation\ReputationClient;
use Coss\Logs\LogsClient;
use Coss\AuditEvents\AuditEventsClient;
use Coss\Billing\BillingClient;
use Coss\LogDrains\LogDrainsClient;
use Coss\Risk\RiskClient;
use Coss\Hooks\HooksClient;
use Psr\Http\Client\ClientInterface;
use Coss\Core\Client\RawClient;
use Exception;

class Coss
{
    /**
     * @var EnvironmentClient $environment
     */
    public EnvironmentClient $environment;

    /**
     * @var ApiKeyClient $apiKey
     */
    public ApiKeyClient $apiKey;

    /**
     * @var EmailClient $email
     */
    public EmailClient $email;

    /**
     * @var DomainsClient $domains
     */
    public DomainsClient $domains;

    /**
     * @var WebhookEndpointsClient $webhookEndpoints
     */
    public WebhookEndpointsClient $webhookEndpoints;

    /**
     * @var WebhookListenersClient $webhookListeners
     */
    public WebhookListenersClient $webhookListeners;

    /**
     * @var ReputationClient $reputation
     */
    public ReputationClient $reputation;

    /**
     * @var LogsClient $logs
     */
    public LogsClient $logs;

    /**
     * @var AuditEventsClient $auditEvents
     */
    public AuditEventsClient $auditEvents;

    /**
     * @var BillingClient $billing
     */
    public BillingClient $billing;

    /**
     * @var LogDrainsClient $logDrains
     */
    public LogDrainsClient $logDrains;

    /**
     * @var RiskClient $risk
     */
    public RiskClient $risk;

    /**
     * @var HooksClient $hooks
     */
    public HooksClient $hooks;

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
     * @param ?string $apiKey The apiKey to use for authentication.
     * @param ?string $apiVersion
     * @param ?array{
     *   baseUrl?: string,
     *   client?: ClientInterface,
     *   maxRetries?: int,
     *   timeout?: float,
     *   headers?: array<string, string>,
     * } $options
     */
    public function __construct(
        ?string $apiKey = null,
        ?string $apiVersion = null,
        ?array $options = null,
    ) {
        $apiKey ??= $this->getFromEnvOrThrow('COSS_API_KEY', 'Please pass in apiKey or set the environment variable COSS_API_KEY.');
        $apiVersion ??= '2026-10-10';
        $defaultHeaders = [
            'Authorization' => "Bearer $apiKey",
            'X-Fern-Language' => 'PHP',
            'X-Fern-SDK-Name' => 'Coss',
            'X-Fern-SDK-Version' => '0.1.0',
            'User-Agent' => 'coss-php/0.1.0',
        ];
        if ($apiVersion != null) {
            $defaultHeaders['Coss-Version'] = $apiVersion;
        }

        $this->options = $options ?? [];

        $this->options['headers'] = array_merge(
            $defaultHeaders,
            $this->options['headers'] ?? [],
        );

        $this->client = new RawClient(
            options: $this->options,
        );

        $this->environment = new EnvironmentClient($this->client, $this->options);
        $this->apiKey = new ApiKeyClient($this->client, $this->options);
        $this->email = new EmailClient($this->client, $this->options);
        $this->domains = new DomainsClient($this->client, $this->options);
        $this->webhookEndpoints = new WebhookEndpointsClient($this->client, $this->options);
        $this->webhookListeners = new WebhookListenersClient($this->client, $this->options);
        $this->reputation = new ReputationClient($this->client, $this->options);
        $this->logs = new LogsClient($this->client, $this->options);
        $this->auditEvents = new AuditEventsClient($this->client, $this->options);
        $this->billing = new BillingClient($this->client, $this->options);
        $this->logDrains = new LogDrainsClient($this->client, $this->options);
        $this->risk = new RiskClient($this->client, $this->options);
        $this->hooks = new HooksClient($this->client, $this->options);
    }

    /**
     * @param string $env
     * @param string $message
     * @return string
     */
    private function getFromEnvOrThrow(string $env, string $message): string
    {
        $value = getenv($env);
        return $value ? (string) $value : throw new Exception($message);
    }
}
