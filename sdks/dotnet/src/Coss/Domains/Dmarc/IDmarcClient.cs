using Coss;
using Coss.Domains.Dmarc;

namespace Coss.Domains;

public partial interface IDmarcClient
{
    public IReportsClient Reports { get; }

    /// <summary>
    /// The domain's published DMARC record, where it is on the path from `p=none` to `p=reject`, the record to publish next and whether the last 14 days of aggregate reports say that is safe (`ready`, with the `checks` behind it), and a summary of those reports. Mailbox providers send DMARC aggregate reports to the domain's `report_address` once its `_dmarc` record names it (`rua=mailto:…`), usually once a day each.
    /// </summary>
    WithRawResponseTask<DomainDmarc> GetAsync(
        GetDmarcRequest request,
        RequestOptions? options = null,
        CancellationToken cancellationToken = default
    );
}
