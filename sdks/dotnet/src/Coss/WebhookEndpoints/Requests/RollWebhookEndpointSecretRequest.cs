using Coss.Core;
using global::System.Text.Json.Serialization;

namespace Coss;

[Serializable]
public record RollWebhookEndpointSecretRequest
{
    /// <summary>
    /// The webhook endpoint's id.
    /// </summary>
    [JsonIgnore]
    public required string Id { get; set; }

    /// <summary>
    /// Seconds the current secret keeps signing deliveries next to the new one, so receivers can switch without rejecting anything. Default 86400 (a day), at most 604800 (a week). `0` stops it immediately, e.g. after a leak.
    /// </summary>
    [JsonPropertyName("previous_secret_expires_in")]
    public int? PreviousSecretExpiresIn { get; set; }

    /// <inheritdoc />
    public override string ToString()
    {
        return JsonUtils.Serialize(this);
    }
}
