using Coss;

namespace Coss.Domains;

public partial interface IReceivingClient
{
    /// <summary>
    /// Starts receiving email at the domain itself or a subdomain (e.g. `inbound.acme.com`): email sent to any address at that hostname becomes a received email of the API key's environment (an `email.received` webhook, `GET /v1/received_emails`). Publish the MX record in `receiving.record`; coss.com checks it in the background. Using the domain itself moves all of its mail to coss.com. A domain has at most one receiving hostname: remove it to use another one.
    /// </summary>
    WithRawResponseTask<Domain> CreateAsync(
        CreateReceivingDomainRequest request,
        RequestOptions? options = null,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// Stops receiving at the domain's receiving hostname: later mail to it is dropped (remove the MX record too). Emails already received stay until their retention ends.
    /// </summary>
    WithRawResponseTask<Domain> DeleteAsync(
        DeleteReceivingRequest request,
        RequestOptions? options = null,
        CancellationToken cancellationToken = default
    );
}
