using Coss;

namespace Coss.Risk;

public partial interface ISettingsClient
{
    /// <summary>
    /// The API key's environment's decision thresholds, disabled reasons and captcha provider (never its secret).
    /// </summary>
    WithRawResponseTask<RiskSettings> GetAsync(
        RequestOptions? options = null,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// Changes the fields given. `review_threshold` must not exceed `block_threshold`. Disabled reasons never fire (rules still see the facts behind them). Setting a captcha provider makes assessments verify their `captcha.token` with it; `required` adds `captcha.missing` to assessments without one. `reason_weights` replaces reasons' default weights (for example with calibration's `suggested_weight`); `null` restores a default.
    /// </summary>
    WithRawResponseTask<RiskSettings> UpdateAsync(
        UpdateRiskSettingsRequest request,
        RequestOptions? options = null,
        CancellationToken cancellationToken = default
    );
}
