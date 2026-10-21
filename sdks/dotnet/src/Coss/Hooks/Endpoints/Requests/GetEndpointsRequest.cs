using Coss.Core;
using global::System.Text.Json.Serialization;

namespace Coss.Hooks;

[Serializable]
public record GetEndpointsRequest
{
    /// <summary>
    /// The application's `id` (`happ_…`) or your `uid` for it.
    /// </summary>
    [JsonIgnore]
    public required string Application { get; set; }

    /// <summary>
    /// The endpoint's id.
    /// </summary>
    [JsonIgnore]
    public required string EndpointId { get; set; }

    /// <inheritdoc />
    public override string ToString()
    {
        return JsonUtils.Serialize(this);
    }
}
