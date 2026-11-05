using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss;

[Serializable]
public record SchedulingReassignmentSelection : IJsonOnDeserialized
{
    [JsonExtensionData]
    private readonly IDictionary<string, JsonElement> _extensionData =
        new Dictionary<string, JsonElement>();

    /// <summary>
    /// This host's bookings, by id or uid.
    /// </summary>
    [Optional]
    [JsonPropertyName("host")]
    public string? Host { get; set; }

    /// <summary>
    /// The bookings that fall in this entry.
    /// </summary>
    [Optional]
    [JsonPropertyName("out_of_office")]
    public string? OutOfOffice { get; set; }

    [Optional]
    [JsonPropertyName("booking_ids")]
    public IEnumerable<string>? BookingIds { get; set; }

    /// <summary>
    /// A series' occurrences still to come.
    /// </summary>
    [Optional]
    [JsonPropertyName("series")]
    public string? Series { get; set; }

    /// <summary>
    /// An ISO 8601 instant with an offset.
    /// </summary>
    [Optional]
    [JsonPropertyName("start_after")]
    public string? StartAfter { get; set; }

    /// <summary>
    /// An ISO 8601 instant with an offset.
    /// </summary>
    [Optional]
    [JsonPropertyName("start_before")]
    public string? StartBefore { get; set; }

    [Optional]
    [JsonPropertyName("event_types")]
    public IEnumerable<string>? EventTypes { get; set; }

    /// <summary>
    /// Only those with something else on the host's calendar at that time.
    /// </summary>
    [Optional]
    [JsonPropertyName("external_conflict")]
    public bool? ExternalConflict { get; set; }

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
