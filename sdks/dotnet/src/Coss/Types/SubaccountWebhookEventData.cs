using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss;

[Serializable]
public record SubaccountWebhookEventData : IJsonOnDeserialized
{
    [JsonExtensionData]
    private readonly IDictionary<string, JsonElement> _extensionData =
        new Dictionary<string, JsonElement>();

    [JsonPropertyName("subaccount_id")]
    public required string SubaccountId { get; set; }

    [Nullable]
    [JsonPropertyName("uid")]
    public string? Uid { get; set; }

    [JsonPropertyName("status")]
    public required SubaccountWebhookEventDataStatus Status { get; set; }

    [JsonPropertyName("previous_status")]
    public required SubaccountWebhookEventDataPreviousStatus PreviousStatus { get; set; }

    /// <summary>
    /// What changed it: a check (`bounce_rate`, `complaint_rate`), `content_screening` or `reinstated`.
    /// </summary>
    [Nullable]
    [JsonPropertyName("trigger")]
    public string? Trigger { get; set; }

    [JsonPropertyName("occurred_at")]
    public required DateTime OccurredAt { get; set; }

    /// <summary>
    /// The measurements behind the change (empty for reinstatements and screening).
    /// </summary>
    [JsonPropertyName("checks")]
    public IEnumerable<ReputationCheck> Checks { get; set; } = new List<ReputationCheck>();

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
