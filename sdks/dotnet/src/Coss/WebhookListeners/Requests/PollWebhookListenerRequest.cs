using Coss.Core;
using global::System.Text.Json.Serialization;

namespace Coss;

[Serializable]
public record PollWebhookListenerRequest
{
    /// <summary>
    /// The webhook listener's id.
    /// </summary>
    [JsonIgnore]
    public required string Id { get; set; }

    /// <summary>
    /// What happened to deliveries handed out earlier. A delivery is finished once acknowledged: a 2xx status (or none, with no error) succeeds; anything else fails. Neither is retried.
    /// </summary>
    [JsonPropertyName("acks")]
    public IEnumerable<WebhookListenerAck>? Acks { get; set; }

    /// <summary>
    /// How long to wait for deliveries when none is pending, in milliseconds. Default 20000, at most 25000.
    /// </summary>
    [JsonPropertyName("wait_ms")]
    public int? WaitMs { get; set; }

    /// <summary>
    /// The most deliveries to hand out. Default 10, at most 50.
    /// </summary>
    [JsonPropertyName("limit")]
    public int? Limit { get; set; }

    /// <inheritdoc />
    public override string ToString()
    {
        return JsonUtils.Serialize(this);
    }
}
