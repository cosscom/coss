using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss;

[Serializable]
public record UpdateFormRequestFiles : IJsonOnDeserialized
{
    [JsonExtensionData]
    private readonly IDictionary<string, JsonElement> _extensionData =
        new Dictionary<string, JsonElement>();

    /// <summary>
    /// Accept uploads (`multipart/form-data`). Default false.
    /// </summary>
    [Optional]
    [JsonPropertyName("enabled")]
    public bool? Enabled { get; set; }

    [Optional]
    [JsonPropertyName("max_files")]
    public int? MaxFiles { get; set; }

    [Optional]
    [JsonPropertyName("max_file_bytes")]
    public int? MaxFileBytes { get; set; }

    /// <summary>
    /// MIME types (`image/*` allowed). Empty: images, PDFs, text and Office.
    /// </summary>
    [Optional]
    [JsonPropertyName("allowed_types")]
    public IEnumerable<string>? AllowedTypes { get; set; }

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
