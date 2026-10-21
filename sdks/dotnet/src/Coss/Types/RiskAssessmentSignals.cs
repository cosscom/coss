using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss;

[Serializable]
public record RiskAssessmentSignals : IJsonOnDeserialized
{
    [JsonExtensionData]
    private readonly IDictionary<string, JsonElement> _extensionData =
        new Dictionary<string, JsonElement>();

    [Nullable]
    [JsonPropertyName("email")]
    public RiskEmailSignals? Email { get; set; }

    [Nullable]
    [JsonPropertyName("ip")]
    public RiskIpSignals? Ip { get; set; }

    /// <summary>
    /// `null` when velocity was unavailable (see `degraded`).
    /// </summary>
    [Nullable]
    [JsonPropertyName("velocity")]
    public Dictionary<string, long>? Velocity { get; set; }

    [Nullable]
    [JsonPropertyName("captcha")]
    public RiskCaptchaSignals? Captcha { get; set; }

    [Nullable]
    [JsonPropertyName("login")]
    public RiskLoginSignals? Login { get; set; }

    /// <summary>
    /// `null` when no content was given or it couldn't be classified.
    /// </summary>
    [Nullable]
    [JsonPropertyName("content")]
    public RiskContentSignals? Content { get; set; }

    [Nullable]
    [JsonPropertyName("checkout")]
    public RiskCheckoutSignals? Checkout { get; set; }

    [Nullable]
    [JsonPropertyName("device")]
    public RiskDeviceSignals? Device { get; set; }

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
