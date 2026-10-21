using Coss;
using Coss.Core;
using global::System.Text.Json.Serialization;

namespace Coss.Risk;

[Serializable]
public record ListAssessmentsRequest
{
    /// <summary>
    /// What is being assessed. `custom` events are named by `event_name`; velocity is counted per event.
    /// </summary>
    [JsonIgnore]
    public RiskEvent? Event { get; set; }

    /// <summary>
    /// `allow`: go ahead. `review`: suspicious; let it through with limits, or hold it for a person. `block`: refuse it.
    /// </summary>
    [JsonIgnore]
    public RiskDecision? Decision { get; set; }

    /// <summary>
    /// Only assessments of this user.
    /// </summary>
    [JsonIgnore]
    public string? UserId { get; set; }

    /// <summary>
    /// `open`: the review queue.
    /// </summary>
    [JsonIgnore]
    public ListAssessmentsRequestReviewStatus? ReviewStatus { get; set; }

    /// <summary>
    /// 1-100, default 50.
    /// </summary>
    [JsonIgnore]
    public int? Limit { get; set; }

    /// <summary>
    /// Cursor: the `id` of the last entry of the previous page.
    /// </summary>
    [JsonIgnore]
    public string? After { get; set; }

    /// <inheritdoc />
    public override string ToString()
    {
        return JsonUtils.Serialize(this);
    }
}
