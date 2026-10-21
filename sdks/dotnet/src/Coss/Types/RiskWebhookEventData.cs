using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss;

[Serializable]
public record RiskWebhookEventData : IJsonOnDeserialized
{
    [JsonExtensionData]
    private readonly IDictionary<string, JsonElement> _extensionData =
        new Dictionary<string, JsonElement>();

    [JsonPropertyName("assessment_id")]
    public required string AssessmentId { get; set; }

    [JsonPropertyName("event")]
    public required RiskEvent Event { get; set; }

    [JsonPropertyName("event_name")]
    public string? EventName { get; set; }

    [JsonPropertyName("decision")]
    public required RiskDecision Decision { get; set; }

    [JsonPropertyName("score")]
    public required double Score { get; set; }

    [JsonPropertyName("reasons")]
    public IEnumerable<RiskReason> Reasons { get; set; } = new List<RiskReason>();

    [JsonPropertyName("user_id")]
    public string? UserId { get; set; }

    /// <summary>
    /// `risk.assessment.reviewed`: the outcome that resolved the review.
    /// </summary>
    [JsonPropertyName("outcome")]
    public RiskOutcome? Outcome { get; set; }

    [JsonPropertyName("occurred_at")]
    public required DateTime OccurredAt { get; set; }

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
