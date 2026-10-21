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

    [Nullable, Optional]
    [JsonPropertyName("spam")]
    public Optional<double?> Spam { get; set; }

    [Nullable, Optional]
    [JsonPropertyName("phishing")]
    public Optional<double?> Phishing { get; set; }

    [Nullable, Optional]
    [JsonPropertyName("malware")]
    public Optional<double?> Malware { get; set; }

    [Nullable, Optional]
    [JsonPropertyName("fraud")]
    public Optional<double?> Fraud { get; set; }

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
