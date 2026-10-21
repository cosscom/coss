using Coss.Core;
using global::System.Text.Json.Serialization;

namespace Coss.Risk;

[Serializable]
public record UpdateRiskLimitBucketRequest
{
    /// <summary>
    /// The bucket's id.
    /// </summary>
    [JsonIgnore]
    public required string Id { get; set; }

    [Optional]
    [JsonPropertyName("limit")]
    public int? Limit { get; set; }

    [Optional]
    [JsonPropertyName("period_seconds")]
    public int? PeriodSeconds { get; set; }

    [Optional]
    [JsonPropertyName("burst")]
    public int? Burst { get; set; }

    [Optional]
    [JsonPropertyName("on_failure")]
    public UpdateRiskLimitBucketRequestOnFailure? OnFailure { get; set; }

    /// <inheritdoc />
    public override string ToString()
    {
        return JsonUtils.Serialize(this);
    }
}
