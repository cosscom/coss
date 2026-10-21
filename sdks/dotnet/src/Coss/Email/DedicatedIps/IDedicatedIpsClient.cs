using Coss;

namespace Coss.Email;

public partial interface IDedicatedIpsClient
{
    /// <summary>
    /// The organization's dedicated IP pool (the Dedicated IPs add-on, bought on the dashboard's billing page): its status, its IPs and how much of the last week's mail they delivered. Organization-wide, like domains: every environment's key sees the same pool; only live emails go through it. Without the add-on the status is `not_enabled`.
    /// </summary>
    WithRawResponseTask<DedicatedIpPool> GetAsync(
        RequestOptions? options = null,
        CancellationToken cancellationToken = default
    );
}
