using Coss.Core;
using global::System.Text.Json.Serialization;

namespace Coss.Risk;

[Serializable]
public record UpdateRiskSettingsRequest
{
    [JsonPropertyName("review_threshold")]
    public double? ReviewThreshold { get; set; }

    [JsonPropertyName("block_threshold")]
    public double? BlockThreshold { get; set; }

    [JsonPropertyName("disabled_reasons")]
    public IEnumerable<UpdateRiskSettingsRequestDisabledReasonsItem>? DisabledReasons { get; set; }

    /// <summary>
    /// `null` turns captcha verification off and deletes the secret.
    /// </summary>
    [JsonPropertyName("captcha")]
    public UpdateRiskSettingsRequestCaptcha? Captcha { get; set; }

    /// <summary>
    /// Changes the categories given: a score in (0, 1] sets the threshold, `null` removes it.
    /// </summary>
    [JsonPropertyName("content_thresholds")]
    public UpdateRiskSettingsRequestContentThresholds? ContentThresholds { get; set; }

    /// <summary>
    /// Changes the reasons given: a weight in [0, 0.99] replaces the default, `null` goes back to it.
    /// </summary>
    [JsonPropertyName("reason_weights")]
    public UpdateRiskSettingsRequestReasonWeights? ReasonWeights { get; set; }

    /// <inheritdoc />
    public override string ToString()
    {
        return JsonUtils.Serialize(this);
    }
}
