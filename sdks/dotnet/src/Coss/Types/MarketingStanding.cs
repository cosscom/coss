using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss;

[Serializable]
public record MarketingStanding : IJsonOnDeserialized
{
    [JsonExtensionData]
    private readonly IDictionary<string, JsonElement> _extensionData =
        new Dictionary<string, JsonElement>();

    /// <summary>
    /// `active`, or `paused`: the marketing stream's bounce or complaint rate reached its suspension threshold, so marketing sends are refused until coss.com support lifts the pause. Transactional email is unaffected.
    /// </summary>
    [JsonPropertyName("status")]
    public required MarketingStandingStatus Status { get; set; }

    /// <summary>
    /// The trigger behind a pause.
    /// </summary>
    [JsonPropertyName("reason")]
    public string? Reason { get; set; }

    [JsonPropertyName("paused_at")]
    public DateTime? PausedAt { get; set; }

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
