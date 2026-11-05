using Coss.Core;
using global::System.Text.Json.Serialization;

namespace Coss.Scheduling;

[Serializable]
public record UndoSchedulingReassignmentRequest
{
    /// <summary>
    /// The reassignment's id.
    /// </summary>
    [JsonIgnore]
    public required string Id { get; set; }

    [Optional]
    [JsonPropertyName("reason_code")]
    public UndoSchedulingReassignmentRequestReasonCode? ReasonCode { get; set; }

    [Optional]
    [JsonPropertyName("note")]
    public string? Note { get; set; }

    [Optional]
    [JsonPropertyName("overrides")]
    public IEnumerable<UndoSchedulingReassignmentRequestOverridesItem>? Overrides { get; set; }

    [Optional]
    [JsonPropertyName("notify")]
    public UndoSchedulingReassignmentRequestNotify? Notify { get; set; }

    /// <inheritdoc />
    public override string ToString()
    {
        return JsonUtils.Serialize(this);
    }
}
