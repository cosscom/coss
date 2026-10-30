using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss;

[Serializable]
public record SignField : IJsonOnDeserialized
{
    [JsonExtensionData]
    private readonly IDictionary<string, JsonElement> _extensionData =
        new Dictionary<string, JsonElement>();

    [JsonPropertyName("object")]
    public required SignFieldObject Object { get; set; }

    [JsonPropertyName("id")]
    public required string Id { get; set; }

    [JsonPropertyName("signer_id")]
    public required string SignerId { get; set; }

    [JsonPropertyName("document_id")]
    public required string DocumentId { get; set; }

    [JsonPropertyName("type")]
    public required SignFieldType Type { get; set; }

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

    [JsonPropertyName("required")]
    public required bool Required { get; set; }

    [Nullable]
    [JsonPropertyName("label")]
    public string? Label { get; set; }

    [Nullable]
    [JsonPropertyName("anchor")]
    public string? Anchor { get; set; }

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
