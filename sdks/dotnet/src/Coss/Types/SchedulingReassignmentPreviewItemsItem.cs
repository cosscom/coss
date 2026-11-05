using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss;

[Serializable]
public record SchedulingReassignmentPreviewItemsItem : IJsonOnDeserialized
{
    [JsonExtensionData]
    private readonly IDictionary<string, JsonElement> _extensionData =
        new Dictionary<string, JsonElement>();

    [JsonPropertyName("booking")]
    public required string Booking { get; set; }

    [JsonPropertyName("event_type")]
    public required string EventType { get; set; }

    [JsonPropertyName("title")]
    public required string Title { get; set; }

    [JsonPropertyName("status")]
    public required SchedulingReassignmentPreviewItemsItemStatus Status { get; set; }

    [JsonPropertyName("start")]
    public required string Start { get; set; }

    [JsonPropertyName("end")]
    public required string End { get; set; }

    [Nullable]
    [JsonPropertyName("series")]
    public string? Series { get; set; }

    [Nullable]
    [JsonPropertyName("group_session")]
    public string? GroupSession { get; set; }

    [Nullable]
    [JsonPropertyName("from_host")]
    public string? FromHost { get; set; }

    /// <summary>
    /// Null when nobody could take it.
    /// </summary>
    [Nullable]
    [JsonPropertyName("to_host")]
    public string? ToHost { get; set; }

    /// <summary>
    /// Why it would stay where it is.
    /// </summary>
    [Nullable]
    [JsonPropertyName("reason")]
    public string? Reason { get; set; }

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
