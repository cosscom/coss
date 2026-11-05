using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss;

[Serializable]
public record SchedulingReassignmentWebhookEventData : IJsonOnDeserialized
{
    [JsonExtensionData]
    private readonly IDictionary<string, JsonElement> _extensionData =
        new Dictionary<string, JsonElement>();

    [JsonPropertyName("reassignment_id")]
    public required string ReassignmentId { get; set; }

    [JsonPropertyName("status")]
    public required SchedulingReassignmentWebhookEventDataStatus Status { get; set; }

    [Nullable]
    [JsonPropertyName("out_of_office_id")]
    public string? OutOfOfficeId { get; set; }

    [JsonPropertyName("counts")]
    public required SchedulingReassignmentWebhookEventDataCounts Counts { get; set; }

    [JsonPropertyName("occurred_at")]
    public required string OccurredAt { get; set; }

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
