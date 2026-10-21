using Coss.Core;
using global::System.Text.Json.Serialization;

namespace Coss.Hooks;

[Serializable]
public record RollHookEndpointSecretRequest
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
    /// Seconds the current secret keeps signing next to the new one. Default 86400 (a day), at most 604800 (a week); `0` stops it immediately.
    /// </summary>
    [Optional]
    [JsonPropertyName("previous_secret_expires_in")]
    public int? PreviousSecretExpiresIn { get; set; }

    /// <inheritdoc />
    public override string ToString()
    {
        return JsonUtils.Serialize(this);
    }
}
