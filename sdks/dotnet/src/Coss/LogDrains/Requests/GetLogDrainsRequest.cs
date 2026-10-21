using Coss.Core;
using global::System.Text.Json.Serialization;

namespace Coss;

[Serializable]
public record GetLogDrainsRequest
{
    /// <summary>
    /// The log drain's id.
    /// </summary>
    [JsonIgnore]
    public required string Id { get; set; }

    /// <inheritdoc />
    public override string ToString()
    {
        return JsonUtils.Serialize(this);
    }
}
