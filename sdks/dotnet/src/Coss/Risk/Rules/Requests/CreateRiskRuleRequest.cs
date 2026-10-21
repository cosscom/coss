using Coss;
using Coss.Core;
using global::System.Text.Json.Serialization;

namespace Coss.Risk;

[Serializable]
public record CreateRiskRuleRequest
{
    [JsonPropertyName("name")]
    public required string Name { get; set; }

    [JsonPropertyName("enabled")]
    public bool? Enabled { get; set; }

    /// <summary>
    /// Default 0.
    /// </summary>
    [JsonPropertyName("position")]
    public int? Position { get; set; }

    [JsonPropertyName("events")]
    public IEnumerable<RiskEvent>? Events { get; set; }

    /// <summary>
    /// Default `all`.
    /// </summary>
    [JsonPropertyName("match")]
    public CreateRiskRuleRequestMatch? Match { get; set; }

    [JsonPropertyName("conditions")]
    public IEnumerable<RiskRuleCondition> Conditions { get; set; } = new List<RiskRuleCondition>();

    [JsonPropertyName("action")]
    public required RiskDecision Action { get; set; }

    /// <inheritdoc />
    public override string ToString()
    {
        return JsonUtils.Serialize(this);
    }
}
