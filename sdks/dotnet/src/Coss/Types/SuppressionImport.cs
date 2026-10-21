using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss;

[Serializable]
public record SuppressionImport : IJsonOnDeserialized
{
    [JsonExtensionData]
    private readonly IDictionary<string, JsonElement> _extensionData =
        new Dictionary<string, JsonElement>();

    [JsonPropertyName("object")]
    public required SuppressionImportObject Object { get; set; }

    /// <summary>
    /// Entries added by this import.
    /// </summary>
    [JsonPropertyName("created")]
    public required long Created { get; set; }

    /// <summary>
    /// Valid entries that were already on the list (or repeated within this import); unchanged.
    /// </summary>
    [JsonPropertyName("existing")]
    public required long Existing { get; set; }

    /// <summary>
    /// Entries that were skipped, with the reason.
    /// </summary>
    [JsonPropertyName("invalid")]
    public IEnumerable<SuppressionImportInvalidItem> Invalid { get; set; } =
        new List<SuppressionImportInvalidItem>();

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
