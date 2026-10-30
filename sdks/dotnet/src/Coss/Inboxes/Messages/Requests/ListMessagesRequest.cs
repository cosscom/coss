using Coss.Core;
using global::System.Text.Json.Serialization;

namespace Coss.Inboxes;

[Serializable]
public record ListMessagesRequest
{
    /// <summary>
    /// The inbox's id.
    /// </summary>
    [JsonIgnore]
    public required string InboxId { get; set; }

    /// <summary>
    /// 1-100, default 20.
    /// </summary>
    [JsonIgnore]
    public int? Limit { get; set; }

    /// <summary>
    /// Cursor: the `id` of the last item of the previous page.
    /// </summary>
    [JsonIgnore]
    public string? After { get; set; }

    /// <summary>
    /// Only inbound (received) or outbound (sent) messages.
    /// </summary>
    [JsonIgnore]
    public ListMessagesRequestDirection? Direction { get; set; }

    /// <inheritdoc />
    public override string ToString()
    {
        return JsonUtils.Serialize(this);
    }
}
