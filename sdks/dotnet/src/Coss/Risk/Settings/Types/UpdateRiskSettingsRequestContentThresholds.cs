using Coss;
using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss.Risk;

/// <summary>
/// Changes the categories given: a score in (0, 1] sets the threshold, `null` removes it.
/// </summary>
[Serializable]
public record UpdateRiskSettingsRequestContentThresholds : IJsonOnDeserialized
{
    [JsonExtensionData]
    private readonly IDictionary<string, JsonElement> _extensionData =
        new Dictionary<string, JsonElement>();

    [JsonPropertyName("spam")]
    public double? Spam { get; set; }

    [JsonPropertyName("phishing")]
    public double? Phishing { get; set; }

    [JsonPropertyName("malware")]
    public double? Malware { get; set; }

    [JsonPropertyName("fraud")]
    public double? Fraud { get; set; }

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
