using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss;

[Serializable]
public record WebhookListenerDelivery : IJsonOnDeserialized
{
    [JsonExtensionData]
    private readonly IDictionary<string, JsonElement> _extensionData =
        new Dictionary<string, JsonElement>();

    [JsonPropertyName("object")]
    public required WebhookListenerDeliveryObject Object { get; set; }

    [JsonPropertyName("id")]
    public required string Id { get; set; }

    /// <summary>
    /// Send it back with the delivery's acknowledgement in a later poll.
    /// </summary>
    [JsonPropertyName("ack_token")]
    public required string AckToken { get; set; }

    /// <summary>
    /// The event's id: the `id` of the body, and the `webhook-id` header endpoints receive.
    /// </summary>
    [JsonPropertyName("event_id")]
    public required string EventId { get; set; }

    [JsonPropertyName("event_type")]
    public required string EventType { get; set; }

    /// <summary>
    /// How many polls have handed it out: more than 1 when an earlier answer was never acknowledged.
    /// </summary>
    [JsonPropertyName("attempt")]
    public required long Attempt { get; set; }

    /// <summary>
    /// The event body, exactly as an endpoint with the listener's API version would receive it.
    /// </summary>
    [JsonPropertyName("body")]
    public required string Body { get; set; }

    [JsonPropertyName("created_at")]
    public required DateTime CreatedAt { get; set; }

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
