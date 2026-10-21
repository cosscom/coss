using Coss.Core;
using global::System.Text.Json.Serialization;

namespace Coss;

[Serializable]
public record RecoverWebhookEndpointRequest
{
    /// <summary>
    /// The webhook endpoint's id.
    /// </summary>
    [JsonIgnore]
    public required string Id { get; set; }

    /// <summary>
    /// Requeue the endpoint's deliveries that failed and were created at or after this time (ISO 8601). Deliveries are kept for 30 days.
    /// </summary>
    [JsonPropertyName("since")]
    public required DateTime Since { get; set; }

    /// <inheritdoc />
    public override string ToString()
    {
        return JsonUtils.Serialize(this);
    }
}
