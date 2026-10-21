using Coss.Hooks;

namespace Coss;

public partial interface ICossClient
{
    public IEnvironmentClient Environment { get; }
    public IApiKeyClient ApiKey { get; }
    public IEmailClient Email { get; }
    public IDomainsClient Domains { get; }
    public IWebhookEndpointsClient WebhookEndpoints { get; }
    public IWebhookListenersClient WebhookListeners { get; }
    public IReputationClient Reputation { get; }
    public ILogsClient Logs { get; }
    public IAuditEventsClient AuditEvents { get; }
    public IBillingClient Billing { get; }
    public ILogDrainsClient LogDrains { get; }
    public IRiskClient Risk { get; }
    public IHooksClient Hooks { get; }
}
