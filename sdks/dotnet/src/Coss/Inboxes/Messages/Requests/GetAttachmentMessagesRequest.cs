using Coss.Core;
using global::System.Text.Json.Serialization;

namespace Coss.Inboxes;

[Serializable]
public record GetAttachmentMessagesRequest
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

    /// <summary>
    /// The attachment's id (from the message's `attachments`).
    /// </summary>
    [JsonIgnore]
    public required string AttachmentId { get; set; }

    /// <inheritdoc />
    public override string ToString()
    {
        return JsonUtils.Serialize(this);
    }
}
