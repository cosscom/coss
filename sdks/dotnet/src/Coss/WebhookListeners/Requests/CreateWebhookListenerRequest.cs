using Coss.Core;
using global::System.Text.Json.Serialization;

namespace Coss;

[Serializable]
public record CreateWebhookListenerRequest
{
    /// <summary>
    /// Event types to receive. Defaults to every event type.
    /// </summary>
    [JsonPropertyName("event_types")]
    public IEnumerable<CreateWebhookListenerRequestEventTypesItem>? EventTypes { get; set; }

    /// <summary>
    /// The API version events are rendered in. Defaults to the version of the request that creates the listener.
    /// </summary>
    [JsonPropertyName("api_version")]
    public CreateWebhookListenerRequestApiVersion? ApiVersion { get; set; }

    /// <summary>
    /// Where the events go, for your own reference (shown in the log).
    /// </summary>
    [JsonPropertyName("description")]
    public string? Description { get; set; }

    /// <inheritdoc />
    public override string ToString()
    {
        return JsonUtils.Serialize(this);
    }
}
