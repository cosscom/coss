using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss;

[Serializable]
public record FormFiles : IJsonOnDeserialized
{
    [JsonExtensionData]
    private readonly IDictionary<string, JsonElement> _extensionData =
        new Dictionary<string, JsonElement>();

    [JsonPropertyName("enabled")]
    public required bool Enabled { get; set; }

    [JsonPropertyName("max_files")]
    public required long MaxFiles { get; set; }

    [JsonPropertyName("max_file_bytes")]
    public required long MaxFileBytes { get; set; }

    [JsonPropertyName("allowed_types")]
    public IEnumerable<string> AllowedTypes { get; set; } = new List<string>();

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
