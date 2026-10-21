using Coss.Core;
using global::System.Text.Json.Serialization;

namespace Coss.Risk;

[Serializable]
public record GetListsRequest
{
    /// <summary>
    /// The list entry's id.
    /// </summary>
    [JsonIgnore]
    public required string Id { get; set; }

    /// <inheritdoc />
    public override string ToString()
    {
        return JsonUtils.Serialize(this);
    }
}
