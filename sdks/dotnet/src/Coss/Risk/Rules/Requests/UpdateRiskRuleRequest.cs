using Coss;
using Coss.Core;
using global::System.Text.Json.Serialization;

namespace Coss.Risk;

[Serializable]
public record UpdateRiskRuleRequest
{
    /// <summary>
    /// The rule's id.
    /// </summary>
    [JsonIgnore]
    public required string Id { get; set; }

    [Optional]
    [JsonPropertyName("name")]
    public string? Name { get; set; }

    [Optional]
    [JsonPropertyName("enabled")]
    public bool? Enabled { get; set; }

    [Optional]
    [JsonPropertyName("position")]
    public int? Position { get; set; }

    [Optional]
    [JsonPropertyName("events")]
    public IEnumerable<RiskEvent>? Events { get; set; }

    [Optional]
    [JsonPropertyName("match")]
    public UpdateRiskRuleRequestMatch? Match { get; set; }

    [Optional]
    [JsonPropertyName("conditions")]
    public IEnumerable<RiskRuleCondition>? Conditions { get; set; }

    [Optional]
    [JsonPropertyName("action")]
    public RiskDecision? Action { get; set; }

    /// <inheritdoc />
    public override string ToString()
    {
        return JsonUtils.Serialize(this);
    }
}
