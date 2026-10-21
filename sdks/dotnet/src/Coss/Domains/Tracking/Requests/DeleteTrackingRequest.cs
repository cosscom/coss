using Coss.Core;
using global::System.Text.Json.Serialization;

namespace Coss.Domains;

[Serializable]
public record DeleteTrackingRequest
{
    /// <summary>
    /// The domain's id.
    /// </summary>
    [JsonIgnore]
    public required string Id { get; set; }

    /// <inheritdoc />
    public override string ToString()
    {
        return JsonUtils.Serialize(this);
    }
}
