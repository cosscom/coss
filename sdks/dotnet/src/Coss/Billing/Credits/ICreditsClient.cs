using Coss;

namespace Coss.Billing;

public partial interface ICreditsClient
{
    /// <summary>
    /// The organization's credits, newest first: each month's plan credit, prepaid commitments and credits from coss.com support (in dollars, or free units of a product), with what's left. Only usable ones by default (`status=all` for every one). Pass the last `id` as `after` to get the next page while `has_more` is true.
    /// </summary>
    WithRawResponseTask<CreditList> ListAsync(
        ListCreditsRequest request,
        RequestOptions? options = null,
        CancellationToken cancellationToken = default
    );
}
