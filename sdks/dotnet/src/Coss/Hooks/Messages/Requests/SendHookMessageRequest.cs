using Coss.Core;
using global::System.Text.Json.Serialization;

namespace Coss.Hooks;

[Serializable]
public record SendHookMessageRequest
{
    /// <summary>
    /// The application's `id` (`happ_…`) or your `uid` for it.
    /// </summary>
    [JsonIgnore]
    public required string Application { get; set; }

    /// <summary>
    /// Makes retries safe: a repeated request with the same key and body returns the original message instead of sending again, for 24 hours. 1-256 characters.
    /// </summary>
    [JsonIgnore]
    public string? IdempotencyKey { get; set; }

    /// <summary>
    /// What happened, e.g. `invoice.paid`. Endpoints that filter by type only get the types they chose. The type doesn't have to be registered.
    /// </summary>
    [JsonPropertyName("event_type")]
    public required string EventType { get; set; }

    /// <summary>
    /// The JSON object delivered as the request body (at most 256 KB serialized). It is parsed and serialized again: send integers beyond 2^53 as strings.
    /// </summary>
    [JsonPropertyName("payload")]
    public Dictionary<string, object?> Payload { get; set; } = new Dictionary<string, object?>();

    /// <inheritdoc />
    public override string ToString()
    {
        return JsonUtils.Serialize(this);
    }
}
