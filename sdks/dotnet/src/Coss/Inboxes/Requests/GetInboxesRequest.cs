using Coss.Core;
using global::System.Text.Json.Serialization;

namespace Coss;

[Serializable]
public record GetInboxesRequest
{
    /// <summary>
    /// The inbox's id.
    /// </summary>
    [JsonIgnore]
    public required string InboxId { get; set; }

    /// <inheritdoc />
    public override string ToString()
    {
        return JsonUtils.Serialize(this);
    }
}
