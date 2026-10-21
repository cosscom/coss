using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss;

/// <summary>
/// Every bucket of the environment (at most 100), by name.
/// </summary>
[Serializable]
public record RiskLimitBucketList : IJsonOnDeserialized
{
    [JsonExtensionData]
    private readonly IDictionary<string, JsonElement> _extensionData =
        new Dictionary<string, JsonElement>();

    [JsonPropertyName("object")]
    public required RiskLimitBucketListObject Object { get; set; }

    [JsonPropertyName("data")]
    public IEnumerable<RiskLimitBucket> Data { get; set; } = new List<RiskLimitBucket>();

    [JsonPropertyName("has_more")]
    public required bool HasMore { get; set; }

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
