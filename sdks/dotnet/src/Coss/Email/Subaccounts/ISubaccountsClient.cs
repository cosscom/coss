using Coss;

namespace Coss.Email;

public partial interface ISubaccountsClient
{
    /// <summary>
    /// The environment's sub-accounts, newest first. Sub-accounts belong to the API key's own environment: a `coss_test_…` key only ever sees sandbox ones, a `coss_live_…` key only production ones.
    /// </summary>
    WithRawResponseTask<SubaccountList> ListAsync(
        ListSubaccountsRequest request,
        RequestOptions? options = null,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// Creates a sub-account: one of your users, who gets their own domains, suppressions, quotas and reputation. Give it a `uid` (e.g. your user's id) to address it by in every path and send. Sub-accounts belong to the API key's own environment: a `coss_test_…` key only ever sees sandbox ones, a `coss_live_…` key only production ones.
    /// </summary>
    WithRawResponseTask<Subaccount> CreateAsync(
        CreateSubaccountRequest request,
        RequestOptions? options = null,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// A sub-account of the API key's environment, by its id or uid, with its quotas and reputation.
    /// </summary>
    WithRawResponseTask<Subaccount> GetAsync(
        GetSubaccountsRequest request,
        RequestOptions? options = null,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// Starts deleting the sub-account: its sends are refused at once, then its domains are released and it is removed with its suppressions (`status` is `deleting` until then). Its emails stay, with its id. Repeating the call returns it as it is.
    /// </summary>
    WithRawResponseTask<Subaccount> DeleteAsync(
        DeleteSubaccountsRequest request,
        RequestOptions? options = null,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// Changes the name, uid, metadata, status or quotas. Fields left out keep their value; `status: "disabled"` refuses its sends until it is `active` again.
    /// </summary>
    WithRawResponseTask<Subaccount> UpdateAsync(
        UpdateSubaccountRequest request,
        RequestOptions? options = null,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// Lifts the sub-account's reputation pause (or warning) once you fixed what caused it: its rates are measured again from now on. A pause is never lifted on its own. Repeating the call returns it as it is. Your organization's own reputation still counts its sending.
    /// </summary>
    WithRawResponseTask<Subaccount> ReinstateAsync(
        ReinstateSubaccountsRequest request,
        RequestOptions? options = null,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// The sub-account's sending per UTC day: recipients, sent, delivered, bounced, complained, failed and suppressed, counted from its emails as they are now (a later bounce moves its day's numbers). Emails are kept 45 days, so earlier days are left out.
    /// </summary>
    WithRawResponseTask<SubaccountStats> StatsAsync(
        StatsSubaccountsRequest request,
        RequestOptions? options = null,
        CancellationToken cancellationToken = default
    );
}
