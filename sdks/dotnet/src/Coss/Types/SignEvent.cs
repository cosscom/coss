using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss;

[Serializable]
public record SignEvent : IJsonOnDeserialized
{
    [JsonExtensionData]
    private readonly IDictionary<string, JsonElement> _extensionData =
        new Dictionary<string, JsonElement>();

    [JsonPropertyName("object")]
    public required SignEventObject Object { get; set; }

    [JsonPropertyName("id")]
    public required string Id { get; set; }

    /// <summary>
    /// 1-based position in the request's trail.
    /// </summary>
    [JsonPropertyName("sequence")]
    public required long Sequence { get; set; }

    [JsonPropertyName("type")]
    public required SignEventType Type { get; set; }

    [Nullable]
    [JsonPropertyName("signer_id")]
    public string? SignerId { get; set; }

    /// <summary>
    /// Who did it: your API key, a signer, a member in the dashboard, or coss.com.
    /// </summary>
    [JsonPropertyName("actor")]
    public required SignEventActor Actor { get; set; }

    [Nullable]
    [JsonPropertyName("ip_address")]
    public string? IpAddress { get; set; }

    [Nullable]
    [JsonPropertyName("user_agent")]
    public string? UserAgent { get; set; }

    [JsonPropertyName("details")]
    public required SignEventDetails Details { get; set; }

    [JsonPropertyName("occurred_at")]
    public required DateTime OccurredAt { get; set; }

    [Nullable]
    [JsonPropertyName("previous_hash")]
    public string? PreviousHash { get; set; }

    /// <summary>
    /// SHA-256 over this event and `previous_hash`: changing or removing an event breaks the chain from there on.
    /// </summary>
    [JsonPropertyName("hash")]
    public required string Hash { get; set; }

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
