using Coss.Core;
using global::System.Text.Json.Serialization;

namespace Coss.Email;

[Serializable]
public record GetAttachmentReceivedRequest
{
    /// <summary>
    /// The received email's id.
    /// </summary>
    [JsonIgnore]
    public required string Id { get; set; }

    /// <summary>
    /// The attachment's id (from the received email's `attachments`).
    /// </summary>
    [JsonIgnore]
    public required string AttachmentId { get; set; }

    /// <inheritdoc />
    public override string ToString()
    {
        return JsonUtils.Serialize(this);
    }
}
