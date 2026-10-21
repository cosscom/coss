using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss;

[Serializable]
public record WebhookListenerAck : IJsonOnDeserialized
{
    [JsonExtensionData]
    private readonly IDictionary<string, JsonElement> _extensionData =
        new Dictionary<string, JsonElement>();

    [JsonPropertyName("delivery_id")]
    public required string DeliveryId { get; set; }

    /// <summary>
    /// The delivery's `ack_token`.
    /// </summary>
    [JsonPropertyName("ack_token")]
    public required string AckToken { get; set; }

    /// <summary>
    /// What the local URL answered; `null` when nothing answered, or when the event was only printed.
    /// </summary>
    [Nullable]
    [JsonPropertyName("status_code")]
    public int? StatusCode { get; set; }

    [JsonPropertyName("duration_ms")]
    public required int DurationMs { get; set; }

    /// <summary>
    /// Why forwarding failed (e.g. `connection refused`); `null` if it didn't.
    /// </summary>
    [Nullable]
    [JsonPropertyName("error")]
    public string? Error { get; set; }

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
