using Coss.Core;
using global::System.Text.Json.Serialization;

namespace Coss.Hooks;

[Serializable]
public record ListAttemptsDeliveriesRequest
{
    /// <summary>
    /// The application's `id` (`happ_…`) or your `uid` for it.
    /// </summary>
    [JsonIgnore]
    public required string Application { get; set; }

    [JsonIgnore]
    public required string DeliveryId { get; set; }

    /// <inheritdoc />
    public override string ToString()
    {
        return JsonUtils.Serialize(this);
    }
}
