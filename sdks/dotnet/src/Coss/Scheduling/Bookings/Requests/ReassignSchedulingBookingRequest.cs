using Coss.Core;
using global::System.Text.Json.Serialization;

namespace Coss.Scheduling;

[Serializable]
public record ReassignSchedulingBookingRequest
{
    /// <summary>
    /// The booking's id.
    /// </summary>
    [JsonIgnore]
    public required string Id { get; set; }

    /// <summary>
    /// A session or a one-on-one has one. A collective can change several.
    /// </summary>
    [JsonPropertyName("changes")]
    public IEnumerable<ReassignSchedulingBookingRequestChangesItem> Changes { get; set; } =
        new List<ReassignSchedulingBookingRequestChangesItem>();

    [JsonPropertyName("reason_code")]
    public required ReassignSchedulingBookingRequestReasonCode ReasonCode { get; set; }

    /// <summary>
    /// Why, in your words: required with an override of someone's availability. Encrypted, and only in the booking's history.
    /// </summary>
    [Optional]
    [JsonPropertyName("note")]
    public string? Note { get; set; }

    /// <summary>
    /// Go ahead anyway: `any_host` for someone who doesn't take this event type, and the rest for what a candidate's `reason` said. A host who already has something at this time can never be overridden.
    /// </summary>
    [Optional]
    [JsonPropertyName("overrides")]
    public IEnumerable<ReassignSchedulingBookingRequestOverridesItem>? Overrides { get; set; }

    [Optional]
    [JsonPropertyName("notify")]
    public ReassignSchedulingBookingRequestNotify? Notify { get; set; }

    /// <inheritdoc />
    public override string ToString()
    {
        return JsonUtils.Serialize(this);
    }
}
