using Coss.Core;
using global::System.Text.Json.Serialization;

namespace Coss.Hooks;

[Serializable]
public record GetApplicationsRequest
{
    /// <summary>
    /// The application's `id` (`happ_…`) or your `uid` for it.
    /// </summary>
    [JsonIgnore]
    public required string Application { get; set; }

    /// <inheritdoc />
    public override string ToString()
    {
        return JsonUtils.Serialize(this);
    }
}
