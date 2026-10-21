using Coss;

namespace Coss.Sms_;

public partial interface INumbersClient
{
    /// <summary>
    /// Every number of the organization, whether it can send live messages now (its carrier registration is approved) and whether its replies arrive in the API key's environment. Numbers are bought and registered in the dashboard.
    /// </summary>
    WithRawResponseTask<SmsNumberList> ListAsync(
        RequestOptions? options = null,
        CancellationToken cancellationToken = default
    );
}
