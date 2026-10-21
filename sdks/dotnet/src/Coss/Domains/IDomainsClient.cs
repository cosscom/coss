using Coss.Domains;

namespace Coss;

public partial interface IDomainsClient
{
    public Coss.Domains.ITrackingClient Tracking { get; }
    public IReceivingClient Receiving { get; }
    public IDmarcClient Dmarc { get; }

    /// <summary>
    /// Every domain of the organization, ordered by name. Domains belong to the organization, not to one environment, so every API key of the organization sees the same domains.
    /// </summary>
    WithRawResponseTask<DomainList> ListAsync(
        RequestOptions? options = null,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// Claims the domain for the organization and returns the DNS records to publish. Domains belong to the organization, not to one environment, so every API key of the organization sees the same domains. The records are checked repeatedly in the background and verification gives up after 72 hours; until the domain is `verified`, live keys cannot send from it.
    /// </summary>
    WithRawResponseTask<Domain> CreateAsync(
        CreateDomainRequest request,
        RequestOptions? options = null,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// The domain with the result of the last DNS check, so you can show which records are still missing or mismatched.
    /// </summary>
    WithRawResponseTask<Domain> GetAsync(
        GetDomainsRequest request,
        RequestOptions? options = null,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// Removes the domain and its provider identity. Emails already sent are unaffected, but live keys can no longer send from it and the name becomes available again.
    /// </summary>
    WithRawResponseTask<DeletedDomain> DeleteAsync(
        DeleteDomainsRequest request,
        RequestOptions? options = null,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// Asks the delivery provider and DNS about the domain immediately instead of waiting for the next background check, and returns the updated domain. A `failed` domain starts verification over with fresh DKIM records, which have to be published again. Its tracking domain, if any, is checked too (and set up again if it `failed`).
    /// </summary>
    WithRawResponseTask<Domain> VerifyAsync(
        VerifyDomainsRequest request,
        RequestOptions? options = null,
        CancellationToken cancellationToken = default
    );
}
