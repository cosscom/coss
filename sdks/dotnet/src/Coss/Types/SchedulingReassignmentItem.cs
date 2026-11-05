using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss;

[Serializable]
public record SchedulingReassignmentItem : IJsonOnDeserialized
{
    [JsonExtensionData]
    private readonly IDictionary<string, JsonElement> _extensionData =
        new Dictionary<string, JsonElement>();

    [JsonPropertyName("object")]
    public required SchedulingReassignmentItemObject Object { get; set; }

    [JsonPropertyName("id")]
    public required string Id { get; set; }

    [JsonPropertyName("booking")]
    public required string Booking { get; set; }

    [Nullable]
    [JsonPropertyName("from_host")]
    public string? FromHost { get; set; }

    [Nullable]
    [JsonPropertyName("to_host")]
    public string? ToHost { get; set; }

    [JsonPropertyName("outcome")]
    public required SchedulingReassignmentItemOutcome Outcome { get; set; }

    [Nullable]
    [JsonPropertyName("error_code")]
    public string? ErrorCode { get; set; }

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
