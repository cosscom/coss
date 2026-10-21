using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;
using OneOf;

namespace Coss;

[Serializable]
public record TemplateVariable : IJsonOnDeserialized
{
    [JsonExtensionData]
    private readonly IDictionary<string, JsonElement> _extensionData =
        new Dictionary<string, JsonElement>();

    [JsonPropertyName("name")]
    public required string Name { get; set; }

    [JsonPropertyName("type")]
    public required TemplateVariableType Type { get; set; }

    [JsonPropertyName("required")]
    public required bool Required { get; set; }

    [Optional]
    [JsonPropertyName("default")]
    public OneOf<string, double, bool>? Default { get; set; }

    [Optional]
    [JsonPropertyName("description")]
    public string? Description { get; set; }

    [Optional]
    [JsonPropertyName("fields")]
    public IEnumerable<TemplateVariableFieldsItem>? Fields { get; set; }

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
