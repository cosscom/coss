using Coss.Billing;

namespace Coss;

public partial interface IBillingClient
{
    public IInvoicesClient Invoices { get; }
    public ICreditsClient Credits { get; }

    /// <summary>
    /// The organization's plan (and contract), the current billing month's usage and what it would add to the next invoice so far, its standing (`past_due`, billing holds), payment method, and what the plan includes. Organization-wide: every environment's key sees the same. Plan changes are made in the dashboard; subscribe to the `billing.*` webhook events to follow them.
    /// </summary>
    WithRawResponseTask<BillingOverview> GetAsync(
        RequestOptions? options = null,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// Billable usage over a range (the current billing month by default), per meter, dimension and bucket (`hour`, `day` or `month`, UTC), oldest first; with `group_by=environment`, per environment too. Only live environments are billed, so only they appear. Usage counts when it becomes billable (an email when the provider accepts it) and is kept for 400 days.
    /// </summary>
    WithRawResponseTask<UsageList> UsageAsync(
        UsageBillingRequest request,
        RequestOptions? options = null,
        CancellationToken cancellationToken = default
    );
}
