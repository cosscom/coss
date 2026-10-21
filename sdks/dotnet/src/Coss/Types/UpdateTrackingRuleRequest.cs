using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss;

/// <summary>
/// Fields left out keep their current value; a new rule starts with all off. A send's own `tracking` option still wins over the rule.
/// </summary>
[Serializable]
public record UpdateTrackingRuleRequest : IJsonOnDeserialized
{
    [JsonExtensionData]
    private readonly IDictionary<string, JsonElement> _extensionData =
        new Dictionary<string, JsonElement>();

    /// <summary>
    /// Track opens.
    /// </summary>
    [Optional]
    [JsonPropertyName("opens")]
    public bool? Opens { get; set; }

    /// <summary>
    /// Track clicks.
    /// </summary>
    [Optional]
    [JsonPropertyName("clicks")]
    public bool? Clicks { get; set; }

    /// <summary>
    /// Add one-click unsubscribe headers to emails with a category and a single recipient.
    /// </summary>
    [Optional]
    [JsonPropertyName("unsubscribe")]
    public bool? Unsubscribe { get; set; }

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
