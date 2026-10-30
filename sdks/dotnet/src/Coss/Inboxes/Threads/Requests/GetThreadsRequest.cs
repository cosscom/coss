using Coss.Core;
using global::System.Text.Json.Serialization;

namespace Coss.Inboxes;

[Serializable]
public record GetThreadsRequest
{
    /// <summary>
    /// The inbox's id.
    /// </summary>
    [JsonIgnore]
    public required string InboxId { get; set; }

    /// <summary>
    /// The thread's id.
    /// </summary>
    [JsonIgnore]
    public required string ThreadId { get; set; }

    /// <inheritdoc />
    public override string ToString()
    {
        return JsonUtils.Serialize(this);
    }
}
