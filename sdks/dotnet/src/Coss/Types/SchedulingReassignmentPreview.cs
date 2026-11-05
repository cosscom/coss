using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss;

[Serializable]
public record SchedulingReassignmentPreview : IJsonOnDeserialized
{
    [JsonExtensionData]
    private readonly IDictionary<string, JsonElement> _extensionData =
        new Dictionary<string, JsonElement>();

    [JsonPropertyName("object")]
    public required SchedulingReassignmentPreviewObject Object { get; set; }

    [JsonPropertyName("items")]
    public IEnumerable<SchedulingReassignmentPreviewItemsItem> Items { get; set; } =
        new List<SchedulingReassignmentPreviewItemsItem>();

    /// <summary>
    /// There are more than a preview covers.
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
