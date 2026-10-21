using Coss.Core;
using global::System.Text.Json.Serialization;

namespace Coss;

[Serializable]
public record GetAuditEventsRequest
{
    /// <summary>
    /// The audit event's id.
    /// </summary>
    [JsonIgnore]
    public required string Id { get; set; }

    /// <inheritdoc />
    public override string ToString()
    {
        return JsonUtils.Serialize(this);
    }
}
