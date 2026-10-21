using Coss.Core;
using global::System.Text.Json.Serialization;

namespace Coss;

[Serializable]
public record UsageBillingRequest
{
    /// <summary>
    /// Start (inclusive). Defaults to the start of the current billing month.
    /// </summary>
    [JsonIgnore]
    public DateTime? From { get; set; }

    /// <summary>
    /// End (exclusive). Defaults to now. At most 400 days after `from` (7 by hour).
    /// </summary>
    [JsonIgnore]
    public DateTime? To { get; set; }

    /// <summary>
    /// Bucket size (UTC). Defaults to `day`.
    /// </summary>
    [JsonIgnore]
    public UsageBillingRequestGranularity? Granularity { get; set; }

    /// <summary>
    /// Split each bucket per environment, project, API key or user (the member whose personal key it was).
    /// </summary>
    [JsonIgnore]
    public UsageBillingRequestGroupBy? GroupBy { get; set; }

    /// <summary>
    /// Only this meter.
    /// </summary>
    [JsonIgnore]
    public UsageBillingRequestMeter? Meter { get; set; }

    /// <inheritdoc />
    public override string ToString()
    {
        return JsonUtils.Serialize(this);
    }
}
