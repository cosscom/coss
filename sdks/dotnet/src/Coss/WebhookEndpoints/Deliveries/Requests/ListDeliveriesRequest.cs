using Coss.Core;
using global::System.Text.Json.Serialization;

namespace Coss.WebhookEndpoints;

[Serializable]
public record ListDeliveriesRequest
{
    /// <summary>
    /// The webhook endpoint's id.
    /// </summary>
    [JsonIgnore]
    public required string Id { get; set; }

    /// <summary>
    /// Only deliveries with this status.
    /// </summary>
    [JsonIgnore]
    public ListDeliveriesRequestStatus? Status { get; set; }

    /// <summary>
    /// Only the delivery of this event.
    /// </summary>
    [JsonIgnore]
    public string? EventId { get; set; }

    /// <summary>
    /// 1-100, default 50.
    /// </summary>
    [JsonIgnore]
    public int? Limit { get; set; }

    /// <summary>
    /// Cursor: the `id` of the last delivery of the previous page.
    /// </summary>
    [JsonIgnore]
    public string? After { get; set; }

    /// <inheritdoc />
    public override string ToString()
    {
        return JsonUtils.Serialize(this);
    }
}
