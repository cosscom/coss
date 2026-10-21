using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss;

/// <summary>
/// Scores only: coss.com never decides what they mean for you. Neither the text nor the scores are stored.
/// </summary>
[Serializable]
public record RiskContentClassification : IJsonOnDeserialized
{
    [JsonExtensionData]
    private readonly IDictionary<string, JsonElement> _extensionData =
        new Dictionary<string, JsonElement>();

    [JsonPropertyName("object")]
    public required RiskContentClassificationObject Object { get; set; }

    [JsonPropertyName("scores")]
    public required RiskContentSignals Scores { get; set; }

    /// <summary>
    /// The text was longer than the model reads: only its beginning was classified.
    /// </summary>
    [JsonPropertyName("truncated")]
    public required bool Truncated { get; set; }

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
