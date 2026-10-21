using Coss.Core;
using global::System.Text.Json.Serialization;

namespace Coss.WebhookEndpoints;

[Serializable]
public record GetDeliveriesRequest
{
    /// <summary>
    /// The webhook endpoint's id.
    /// </summary>
    [JsonIgnore]
    public required string Id { get; set; }

    /// <summary>
    /// The delivery's id.
    /// </summary>
    [JsonIgnore]
    public required string DeliveryId { get; set; }

    /// <inheritdoc />
    public override string ToString()
    {
        return JsonUtils.Serialize(this);
    }
}
