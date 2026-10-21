using Coss.Core;
using global::System.Text.Json.Serialization;

namespace Coss;

[Serializable]
public record RescheduleEmailRequest
{
    /// <summary>
    /// The email's id.
    /// </summary>
    [JsonIgnore]
    public required string Id { get; set; }

    /// <summary>
    /// The new time to send the email at (ISO 8601 with an offset, at most 30 days ahead). A time that is not in the future sends it right away.
    /// </summary>
    [JsonPropertyName("scheduled_at")]
    public required DateTime ScheduledAt { get; set; }

    /// <inheritdoc />
    public override string ToString()
    {
        return JsonUtils.Serialize(this);
    }
}
