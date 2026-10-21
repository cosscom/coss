using Coss;

namespace Coss.Email;

public partial interface IMarketingSettingsClient
{
    /// <summary>
    /// The API key's environment's sender name and the postal address its marketing emails carry.
    /// </summary>
    WithRawResponseTask<MarketingSettings> GetAsync(
        RequestOptions? options = null,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// Changes the fields given (`null` clears one).
    /// </summary>
    WithRawResponseTask<MarketingSettings> UpdateAsync(
        UpdateMarketingSettingsRequest request,
        RequestOptions? options = null,
        CancellationToken cancellationToken = default
    );
}
