using Coss.Core;
using global::System.Text.Json.Serialization;

namespace Coss;

[Serializable]
public record CreateRiskFeedbackRequest
{
    /// <summary>
    /// The assessment's id.
    /// </summary>
    [JsonIgnore]
    public required string Id { get; set; }

    [JsonPropertyName("outcome")]
    public required RiskOutcome Outcome { get; set; }

    /// <summary>
    /// For your team; never shared.
    /// </summary>
    [Optional]
    [JsonPropertyName("note")]
    public string? Note { get; set; }

    /// <inheritdoc />
    public override string ToString()
    {
        return JsonUtils.Serialize(this);
    }
}
