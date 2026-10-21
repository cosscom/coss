using Coss;

namespace Coss.Domains;

public partial interface ITrackingClient
{
    /// <summary>
    /// Sets up a subdomain of the domain (e.g. `links.acme.com`) to serve open and click tracking. Publish the CNAME record in `tracking.record`; coss.com then issues its certificate and checks it in the background, giving up after 72 hours. Open pixels and click redirects of emails sent from the domain (or its subdomains without a domain of their own) use the tracking domain while it is `active`, and the default tracking host otherwise. A domain has at most one tracking domain: remove it to use another hostname.
    /// </summary>
    WithRawResponseTask<Domain> CreateAsync(
        CreateTrackingDomainRequest request,
        RequestOptions? options = null,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// Removes the domain's tracking domain. Later emails use the default tracking host, but links and open pixels in emails already sent through the tracking domain stop working.
    /// </summary>
    WithRawResponseTask<Domain> DeleteAsync(
        DeleteTrackingRequest request,
        RequestOptions? options = null,
        CancellationToken cancellationToken = default
    );
}
