using Coss.Core;
using global::System.Text.Json.Serialization;

namespace Coss.Scheduling;

[Serializable]
public record ReassignCandidatesBookingsRequest
{
    /// <summary>
    /// The booking's id.
    /// </summary>
    [JsonIgnore]
    public required string Id { get; set; }

    /// <summary>
    /// The host who'd leave, when it could be several.
    /// </summary>
    [JsonIgnore]
    public string? FromHost { get; set; }

    /// <inheritdoc />
    public override string ToString()
    {
        return JsonUtils.Serialize(this);
    }
}
