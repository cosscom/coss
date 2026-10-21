using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;
using OneOf;

namespace Coss;

[Serializable]
public record SegmentFilterConditionsItemConditionsConditionsItemProperty : IJsonOnDeserialized
{
    [JsonExtensionData]
    private readonly IDictionary<string, JsonElement> _extensionData =
        new Dictionary<string, JsonElement>();

    [JsonPropertyName("key")]
    public required string Key { get; set; }

    [JsonPropertyName("op")]
    public required SegmentFilterConditionsItemConditionsConditionsItemPropertyOp Op { get; set; }

    /// <summary>
    /// A list for `in`/`not_in`; none for `exists`/`not_exists`.
    /// </summary>
    [JsonPropertyName("value")]
    public OneOf<
        string,
        double,
        bool,
        IEnumerable<OneOf<string, double, bool>>
    >? Value { get; set; }

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
