using Coss.Core;
using global::System.Text.Json.Serialization;

namespace Coss;

[Serializable]
public record UpdateWebhookEndpointRequest
{
    /// <summary>
    /// The webhook endpoint's id.
    /// </summary>
    [JsonIgnore]
    public required string Id { get; set; }

    /// <summary>
    /// An `https://` URL coss.com posts events to.
    /// </summary>
    [JsonPropertyName("url")]
    public string? Url { get; set; }

    /// <summary>
    /// A note for your own reference. `null` clears it.
    /// </summary>
    [JsonPropertyName("description")]
    public string? Description { get; set; }

    /// <summary>
    /// Event types delivered to this endpoint. An empty array means every event type, including ones added later.
    /// </summary>
    [JsonPropertyName("event_types")]
    public IEnumerable<UpdateWebhookEndpointRequestEventTypesItem>? EventTypes { get; set; }

    /// <summary>
    /// The API version (`Coss-Version`) events are rendered in for this endpoint. Each event carries it as `api_version`.
    /// </summary>
    [JsonPropertyName("api_version")]
    public UpdateWebhookEndpointRequestApiVersion? ApiVersion { get; set; }

    [JsonPropertyName("enabled")]
    public bool? Enabled { get; set; }

    /// <inheritdoc />
    public override string ToString()
    {
        return JsonUtils.Serialize(this);
    }
}
