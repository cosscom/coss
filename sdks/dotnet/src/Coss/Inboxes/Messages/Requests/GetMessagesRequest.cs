using Coss.Core;
using global::System.Text.Json.Serialization;

namespace Coss.Inboxes;

[Serializable]
public record GetMessagesRequest
{
    /// <summary>
    /// The inbox's id.
    /// </summary>
    [JsonIgnore]
    public required string InboxId { get; set; }

    /// <summary>
    /// The message's id.
    /// </summary>
    [JsonIgnore]
    public required string MessageId { get; set; }

    /// <inheritdoc />
    public override string ToString()
    {
        return JsonUtils.Serialize(this);
    }
}
