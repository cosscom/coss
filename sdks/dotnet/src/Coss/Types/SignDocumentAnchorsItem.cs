using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss;

/// <summary>
/// A text anchor found in the document, in points from the page's top left.
/// </summary>
[Serializable]
public record SignDocumentAnchorsItem : IJsonOnDeserialized
{
    [JsonExtensionData]
    private readonly IDictionary<string, JsonElement> _extensionData =
        new Dictionary<string, JsonElement>();

    [JsonPropertyName("text")]
    public required string Text { get; set; }

    [JsonPropertyName("page")]
    public required long Page { get; set; }

    [JsonPropertyName("x")]
    public required double X { get; set; }

    [JsonPropertyName("y")]
    public required double Y { get; set; }

    [JsonPropertyName("width")]
    public required double Width { get; set; }

    [JsonPropertyName("height")]
    public required double Height { get; set; }

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
