using Coss;
using Coss.Core;
using global::System.Text.Json.Serialization;

namespace Coss.Scheduling;

[Serializable]
public record PreviewSchedulingReassignmentRequest
{
    [JsonPropertyName("selection")]
    public required SchedulingReassignmentSelection Selection { get; set; }

    [Optional]
    [JsonPropertyName("strategy")]
    public SchedulingReassignmentStrategy? Strategy { get; set; }

    [Optional]
    [JsonPropertyName("overrides")]
    public IEnumerable<PreviewSchedulingReassignmentRequestOverridesItem>? Overrides { get; set; }

    /// <inheritdoc />
    public override string ToString()
    {
        return JsonUtils.Serialize(this);
    }
}
