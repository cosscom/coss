using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss;

[Serializable]
public record RiskSettings : IJsonOnDeserialized
{
    [JsonExtensionData]
    private readonly IDictionary<string, JsonElement> _extensionData =
        new Dictionary<string, JsonElement>();

    [JsonPropertyName("object")]
    public required RiskSettingsObject Object { get; set; }

    /// <summary>
    /// Scores at or above it are `review`.
    /// </summary>
    [JsonPropertyName("review_threshold")]
    public required double ReviewThreshold { get; set; }

    /// <summary>
    /// Scores at or above it are `block`.
    /// </summary>
    [JsonPropertyName("block_threshold")]
    public required double BlockThreshold { get; set; }

    /// <summary>
    /// Reasons that never fire in this environment (they don't count in the score).
    /// </summary>
    [JsonPropertyName("disabled_reasons")]
    public IEnumerable<RiskSettingsDisabledReasonsItem> DisabledReasons { get; set; } =
        new List<RiskSettingsDisabledReasonsItem>();

    /// <summary>
    /// The captcha provider assessments verify tokens with (never the secret).
    /// </summary>
    [JsonPropertyName("captcha")]
    public RiskSettingsCaptcha? Captcha { get; set; }

    /// <summary>
    /// Per content category, the score at which `content.&lt;category&gt;` fires; `null`: never (the score is still in `signals.content` for your rules).
    /// </summary>
    [JsonPropertyName("content_thresholds")]
    public required RiskSettingsContentThresholds ContentThresholds { get; set; }

    /// <summary>
    /// Reasons whose weight this environment changed (from calibration or by hand); the rest weigh what the reason catalog says.
    /// </summary>
    [JsonPropertyName("reason_weights")]
    public required RiskSettingsReasonWeights ReasonWeights { get; set; }

    /// <summary>
    /// `null` while on the defaults.
    /// </summary>
    [JsonPropertyName("updated_at")]
    public DateTime? UpdatedAt { get; set; }

    [JsonIgnore]
    public ReadOnlyAdditionalProperties AdditionalProperties { get; private set; } = new();

    void IJsonOnDeserialized.OnDeserialized() =>
        AdditionalProperties.CopyFromExtensionData(_extensionData);

    /// <inheritdoc />
    public override string ToString()
    {
        return JsonUtils.Serialize(this);
    }
}
