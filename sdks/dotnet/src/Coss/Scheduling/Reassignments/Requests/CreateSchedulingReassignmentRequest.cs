using Coss;
using Coss.Core;
using global::System.Text.Json.Serialization;

namespace Coss.Scheduling;

[Serializable]
public record CreateSchedulingReassignmentRequest
{
    /// <summary>
    /// Makes retries safe: a repeated request with the same key and body returns the original run instead of starting another, for 24 hours. 1-256 characters.
    /// </summary>
    [JsonIgnore]
    public string? IdempotencyKey { get; set; }

    [JsonPropertyName("selection")]
    public required SchedulingReassignmentSelection Selection { get; set; }

    [Optional]
    [JsonPropertyName("strategy")]
    public SchedulingReassignmentStrategy? Strategy { get; set; }

    [JsonPropertyName("reason_code")]
    public required CreateSchedulingReassignmentRequestReasonCode ReasonCode { get; set; }

    /// <summary>
    /// Why, in your words: required with an override of someone's availability.
    /// </summary>
    [Optional]
    [JsonPropertyName("note")]
    public string? Note { get; set; }

    [Optional]
    [JsonPropertyName("overrides")]
    public IEnumerable<CreateSchedulingReassignmentRequestOverridesItem>? Overrides { get; set; }

    [Optional]
    [JsonPropertyName("notify")]
    public CreateSchedulingReassignmentRequestNotify? Notify { get; set; }

    /// <inheritdoc />
    public override string ToString()
    {
        return JsonUtils.Serialize(this);
    }
}
