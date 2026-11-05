using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss;

[Serializable]
public record SchedulingOutOfOfficeConflict : IJsonOnDeserialized
{
    [JsonExtensionData]
    private readonly IDictionary<string, JsonElement> _extensionData =
        new Dictionary<string, JsonElement>();

    [JsonPropertyName("object")]
    public required SchedulingOutOfOfficeConflictObject Object { get; set; }

    [JsonPropertyName("booking")]
    public required string Booking { get; set; }

    [JsonPropertyName("event_type")]
    public required string EventType { get; set; }

    [JsonPropertyName("title")]
    public required string Title { get; set; }

    [JsonPropertyName("status")]
    public required SchedulingOutOfOfficeConflictStatus Status { get; set; }

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
