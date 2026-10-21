using Coss;

namespace Coss.Billing;

public partial interface IInvoicesClient
{
    /// <summary>
    /// The organization's invoices, newest first, without their lines. Pass the last `id` as `after` to get the next page while `has_more` is true.
    /// </summary>
    WithRawResponseTask<InvoiceList> ListAsync(
        ListInvoicesRequest request,
        RequestOptions? options = null,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// One invoice with its lines.
    /// </summary>
    WithRawResponseTask<Invoice> GetAsync(
        GetInvoicesRequest request,
        RequestOptions? options = null,
        CancellationToken cancellationToken = default
    );
}
