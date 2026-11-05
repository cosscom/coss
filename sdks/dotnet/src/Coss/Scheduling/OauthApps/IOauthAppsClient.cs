using Coss;

namespace Coss.Scheduling;

public partial interface IOauthAppsClient
{
    /// <summary>
    /// At most one per provider, with how many connections use each.
    /// </summary>
    WithRawResponseTask<SchedulingOauthAppList> ListAsync(
        RequestOptions? options = null,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// New consents in this environment use it, so the consent screen shows your brand. Connections made before it stay on coss.com's app until their host consents again. On the Scale plan and above. Secrets are never returned.
    /// </summary>
    WithRawResponseTask<SchedulingOauthApp> CreateAsync(
        CreateOauthAppRequest request,
        RequestOptions? options = null,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// Its status, what to register at the provider, and how many connections use it.
    /// </summary>
    WithRawResponseTask<SchedulingOauthApp> GetAsync(
        GetOauthAppsRequest request,
        RequestOptions? options = null,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// Refused while connections use it (`oauth_app_in_use`), since only it can refresh their access: disconnect them first. New consents go back to coss.com's app.
    /// </summary>
    WithRawResponseTask<DeletedSchedulingOauthApp> DeleteAsync(
        DeleteOauthAppsRequest request,
        RequestOptions? options = null,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// A new client secret is tried on a connection before it replaces the old one, and ends an outage if it works. Its client ID can't change: a different app needs its hosts to consent again.
    /// </summary>
    WithRawResponseTask<SchedulingOauthApp> UpdateAsync(
        UpdateOauthAppRequest request,
        RequestOptions? options = null,
        CancellationToken cancellationToken = default
    );
}
