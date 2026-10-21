using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss;

[Serializable]
public record HookAttempt : IJsonOnDeserialized
{
    [JsonExtensionData]
    private readonly IDictionary<string, JsonElement> _extensionData =
        new Dictionary<string, JsonElement>();

    [JsonPropertyName("object")]
    public required HookAttemptObject Object { get; set; }

    [JsonPropertyName("id")]
    public required string Id { get; set; }

    [JsonPropertyName("delivery_id")]
    public required string DeliveryId { get; set; }

    [JsonPropertyName("endpoint_id")]
    public required string EndpointId { get; set; }

    [JsonPropertyName("attempted_at")]
    public required DateTime AttemptedAt { get; set; }

    /// <summary>
    /// The endpoint's HTTP status; `null` when no response arrived.
    /// </summary>
    [Nullable]
    [JsonPropertyName("status_code")]
    public long? StatusCode { get; set; }

    [JsonPropertyName("duration_ms")]
    public required long DurationMs { get; set; }

    [Nullable]
    [JsonPropertyName("error")]
    public string? Error { get; set; }

    /// <summary>
    /// At most 1 KB of the response body, as text.
    /// </summary>
    [Nullable]
    [JsonPropertyName("response_excerpt")]
    public string? ResponseExcerpt { get; set; }

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
