using Coss.Core;
using global::System.Text.Json.Serialization;

namespace Coss;

[Serializable]
public record CreateWebhookEndpointRequest
{
    /// <summary>
    /// An `https://` URL coss.com posts events to.
    /// </summary>
    [JsonPropertyName("url")]
    public required string Url { get; set; }

    /// <summary>
    /// A note for your own reference. `null` clears it.
    /// </summary>
    [JsonPropertyName("description")]
    public string? Description { get; set; }

    /// <summary>
    /// Event types delivered to this endpoint. An empty array means every event type, including ones added later. Defaults to every event type.
    /// </summary>
    [JsonPropertyName("event_types")]
    public IEnumerable<CreateWebhookEndpointRequestEventTypesItem>? EventTypes { get; set; }

    /// <summary>
    /// The API version (`Coss-Version`) events are rendered in for this endpoint. Each event carries it as `api_version`. Defaults to the version of the request that creates the endpoint.
    /// </summary>
    [JsonPropertyName("api_version")]
    public CreateWebhookEndpointRequestApiVersion? ApiVersion { get; set; }

    /// <inheritdoc />
    public override string ToString()
    {
        return JsonUtils.Serialize(this);
    }
}
