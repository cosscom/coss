using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss;

[Serializable]
public record AccountWebhookEventData : IJsonOnDeserialized
{
    [JsonExtensionData]
    private readonly IDictionary<string, JsonElement> _extensionData =
        new Dictionary<string, JsonElement>();

    [JsonPropertyName("organization_id")]
    public required string OrganizationId { get; set; }

    [JsonPropertyName("status")]
    public required AccountWebhookEventDataStatus Status { get; set; }

    [JsonPropertyName("previous_status")]
    public required AccountWebhookEventDataPreviousStatus PreviousStatus { get; set; }

    [Nullable]
    [JsonPropertyName("reason")]
    public string? Reason { get; set; }

    [JsonPropertyName("occurred_at")]
    public required DateTime OccurredAt { get; set; }

    [JsonPropertyName("checks")]
    public IEnumerable<ReputationCheck> Checks { get; set; } = new List<ReputationCheck>();

    [JsonPropertyName("marketing")]
    public required MarketingStanding Marketing { get; set; }

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
