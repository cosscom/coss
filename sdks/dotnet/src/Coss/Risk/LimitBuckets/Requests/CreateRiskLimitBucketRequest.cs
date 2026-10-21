using Coss.Core;
using global::System.Text.Json.Serialization;

namespace Coss.Risk;

[Serializable]
public record CreateRiskLimitBucketRequest
{
    /// <summary>
    /// Unique in the environment; can't be changed.
    /// </summary>
    [JsonPropertyName("name")]
    public required string Name { get; set; }

    /// <summary>
    /// Tokens added per `period_seconds`.
    /// </summary>
    [JsonPropertyName("limit")]
    public required int Limit { get; set; }

    /// <summary>
    /// 1 second to 1 day.
    /// </summary>
    [JsonPropertyName("period_seconds")]
    public required int PeriodSeconds { get; set; }

    /// <summary>
    /// How many requests a key can make at once. Defaults to `limit`.
    /// </summary>
    [Optional]
    [JsonPropertyName("burst")]
    public int? Burst { get; set; }

    /// <summary>
    /// The answer while coss.com can't count. Defaults to `allow`.
    /// </summary>
    [Optional]
    [JsonPropertyName("on_failure")]
    public CreateRiskLimitBucketRequestOnFailure? OnFailure { get; set; }

    /// <inheritdoc />
    public override string ToString()
    {
        return JsonUtils.Serialize(this);
    }
}
