using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;
using OneOf;

namespace Coss;

/// <summary>
/// A test of one field. A field without a value (no IP, no email…) never matches, whatever the operator.
/// </summary>
[Serializable]
public record RiskRuleCondition : IJsonOnDeserialized
{
    [JsonExtensionData]
    private readonly IDictionary<string, JsonElement> _extensionData =
        new Dictionary<string, JsonElement>();

    [JsonPropertyName("field")]
    public required RiskRuleConditionField Field { get; set; }

    [JsonPropertyName("operator")]
    public required RiskRuleConditionOperator Operator { get; set; }

    [JsonPropertyName("value")]
    public required OneOf<bool, double, string, IEnumerable<string>> Value { get; set; }

    [JsonIgnore]
    public ReadOnlyAdditionalProperties AdditionalProperties { get; private set; } = new();

    void IJsonOnDeserialized.OnDeserialized() =>
        AdditionalProperties.CopyFromExtensionData(_extensionData);

    /// <inheritdoc />
    public override string ToString()
    {
        return JsonUtils.Serialize(this);
    }
}
