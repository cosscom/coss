using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss;

[Serializable]
public record SchedulingReassignment : IJsonOnDeserialized
{
    [JsonExtensionData]
    private readonly IDictionary<string, JsonElement> _extensionData =
        new Dictionary<string, JsonElement>();

    [JsonPropertyName("object")]
    public required SchedulingReassignmentObject Object { get; set; }

    [JsonPropertyName("id")]
    public required string Id { get; set; }

    [JsonPropertyName("status")]
    public required SchedulingReassignmentStatus Status { get; set; }

    [JsonPropertyName("reason_code")]
    public required SchedulingReassignmentReasonCode ReasonCode { get; set; }

    [Nullable]
    [JsonPropertyName("out_of_office")]
    public string? OutOfOffice { get; set; }

    [Nullable]
    [JsonPropertyName("undo_of")]
    public string? UndoOf { get; set; }

    [JsonPropertyName("counts")]
    public required SchedulingReassignmentCounts Counts { get; set; }

    [JsonPropertyName("created_at")]
    public required string CreatedAt { get; set; }

    [Nullable]
    [JsonPropertyName("started_at")]
    public string? StartedAt { get; set; }

    [Nullable]
    [JsonPropertyName("finished_at")]
    public string? FinishedAt { get; set; }

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
