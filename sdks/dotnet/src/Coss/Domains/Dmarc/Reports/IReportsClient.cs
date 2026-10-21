using Coss;

namespace Coss.Domains.Dmarc;

public partial interface IReportsClient
{
    /// <summary>
    /// The aggregate reports received about the domain, newest first, without their rows (retrieve one for those). Pass the last `id` as `after` to get the next page while `has_more` is true. Mailbox providers send DMARC aggregate reports to the domain's `report_address` once its `_dmarc` record names it (`rua=mailto:…`), usually once a day each.
    /// </summary>
    WithRawResponseTask<DmarcReportList> ListAsync(
        ListReportsRequest request,
        RequestOptions? options = null,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// One aggregate report with its rows: each source IP, how many messages it sent, whether they passed DMARC (aligned DKIM or SPF) and what the receiver did with them.
    /// </summary>
    WithRawResponseTask<DmarcReport> GetAsync(
        GetReportsRequest request,
        RequestOptions? options = null,
        CancellationToken cancellationToken = default
    );
}
