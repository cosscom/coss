namespace Coss;

public partial interface IReputationClient
{
    /// <summary>
    /// The organization's standing with the coss.com reputation guard and the latest rates it measured over live environments. When a rate reaches its suspension threshold, live sending is suspended automatically (`account_suspended`) until coss.com support reinstates the organization; sandbox keys keep working. Subscribe to the `account.*` webhook events to be notified of changes.
    /// </summary>
    WithRawResponseTask<Reputation> GetAsync(
        RequestOptions? options = null,
        CancellationToken cancellationToken = default
    );
}
