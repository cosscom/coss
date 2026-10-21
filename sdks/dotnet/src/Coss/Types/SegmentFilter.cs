using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;
using OneOf;

namespace Coss;

/// <summary>
/// Which contacts belong to the segment. Conditions on `property` (custom properties), `email`, `audience` membership, `topic` subscription and `created_at`; one level of nested `{ match, conditions }` groups.
/// </summary>
[Serializable]
public record SegmentFilter : IJsonOnDeserialized
{
    [JsonExtensionData]
    private readonly IDictionary<string, JsonElement> _extensionData =
        new Dictionary<string, JsonElement>();

    [JsonPropertyName("version")]
    public required double Version { get; set; }

    /// <summary>
    /// `all`: every condition must hold; `any`: one is enough.
    /// </summary>
    [JsonPropertyName("match")]
    public required SegmentFilterMatch Match { get; set; }

    [JsonPropertyName("conditions")]
    public IEnumerable<
        OneOf<
            SegmentFilterConditionsItemKey,
            SegmentFilterConditionsItemOne,
            SegmentFilterConditionsItemAudienceId,
            SegmentFilterConditionsItemTopic,
            SegmentFilterConditionsItemField,
            SegmentFilterConditionsItemConditions
        >
    > Conditions { get; set; } =
        new List<
            OneOf<
                SegmentFilterConditionsItemKey,
                SegmentFilterConditionsItemOne,
                SegmentFilterConditionsItemAudienceId,
                SegmentFilterConditionsItemTopic,
                SegmentFilterConditionsItemField,
                SegmentFilterConditionsItemConditions
            >
        >();

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
