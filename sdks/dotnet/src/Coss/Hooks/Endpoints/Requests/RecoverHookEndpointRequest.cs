using Coss.Core;
using global::System.Text.Json.Serialization;

namespace Coss.Hooks;

[Serializable]
public record RecoverHookEndpointRequest
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

    /// <summary>
    /// Requeue deliveries that failed, of messages sent from this time until now.
    /// </summary>
    [JsonPropertyName("since")]
    public required DateTime Since { get; set; }

    /// <inheritdoc />
    public override string ToString()
    {
        return JsonUtils.Serialize(this);
    }
}
