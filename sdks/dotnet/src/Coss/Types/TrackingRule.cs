using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss;

/// <summary>
/// An environment's tracking default (`category: null`) or the rule for one category. Emails are fixed to the settings that applied when they were sent.
/// </summary>
[Serializable]
public record TrackingRule : IJsonOnDeserialized
{
    [JsonExtensionData]
    private readonly IDictionary<string, JsonElement> _extensionData =
        new Dictionary<string, JsonElement>();

    [JsonPropertyName("object")]
    public required TrackingRuleObject Object { get; set; }

    [JsonPropertyName("id")]
    public required string Id { get; set; }

    /// <summary>
    /// The category the rule applies to; `null` for the environment default.
    /// </summary>
    [JsonPropertyName("category")]
    public string? Category { get; set; }

    /// <summary>
    /// Whether opens are tracked.
    /// </summary>
    [JsonPropertyName("opens")]
    public required bool Opens { get; set; }

    /// <summary>
    /// Whether clicks are tracked.
    /// </summary>
    [JsonPropertyName("clicks")]
    public required bool Clicks { get; set; }

    /// <summary>
    /// Whether emails get one-click unsubscribe headers (only emails with a category and a single recipient).
    /// </summary>
    [JsonPropertyName("unsubscribe")]
    public required bool Unsubscribe { get; set; }

    [JsonPropertyName("created_at")]
    public required DateTime CreatedAt { get; set; }

    [JsonPropertyName("updated_at")]
    public required DateTime UpdatedAt { get; set; }

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
