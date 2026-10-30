using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss;

/// <summary>
/// Risk's assessment; `null` when none ran (honeypot).
/// </summary>
[Serializable]
public record FormSubmissionRisk : IJsonOnDeserialized
{
    [JsonExtensionData]
    private readonly IDictionary<string, JsonElement> _extensionData =
        new Dictionary<string, JsonElement>();

    [Nullable]
    [JsonPropertyName("assessment_id")]
    public string? AssessmentId { get; set; }

    [Nullable]
    [JsonPropertyName("decision")]
    public FormSubmissionRiskDecision? Decision { get; set; }

    [Nullable]
    [JsonPropertyName("score")]
    public double? Score { get; set; }

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
