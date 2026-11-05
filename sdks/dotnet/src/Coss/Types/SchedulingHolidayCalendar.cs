using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;
using OneOf;

namespace Coss;

[Serializable]
public record SchedulingHolidayCalendar : IJsonOnDeserialized
{
    [JsonExtensionData]
    private readonly IDictionary<string, JsonElement> _extensionData =
        new Dictionary<string, JsonElement>();

    [JsonPropertyName("object")]
    public required SchedulingHolidayCalendarObject Object { get; set; }

    [JsonPropertyName("id")]
    public required string Id { get; set; }

    [JsonPropertyName("name")]
    public required string Name { get; set; }

    [JsonPropertyName("source")]
    public required SchedulingHolidayCalendarSource Source { get; set; }

    [Nullable]
    [JsonPropertyName("country")]
    public string? Country { get; set; }

    [Nullable]
    [JsonPropertyName("hosts")]
    public IEnumerable<string>? Hosts { get; set; }

    [Nullable]
    [JsonPropertyName("host_filter")]
    public Dictionary<string, OneOf<string, IEnumerable<string>>?>? HostFilter { get; set; }

    [Nullable]
    [JsonPropertyName("regions")]
    public IEnumerable<string>? Regions { get; set; }

    [JsonPropertyName("delegates")]
    public IEnumerable<string> Delegates { get; set; } = new List<string>();

    [JsonPropertyName("existing_bookings")]
    public required SchedulingHolidayCalendarExistingBookings ExistingBookings { get; set; }

    [Nullable]
    [JsonPropertyName("last_read_at")]
    public string? LastReadAt { get; set; }

    /// <summary>
    /// Why its feed couldn't be read.
    /// </summary>
    [Nullable]
    [JsonPropertyName("last_error")]
    public string? LastError { get; set; }

    [JsonPropertyName("created_at")]
    public required string CreatedAt { get; set; }

    [JsonPropertyName("updated_at")]
    public required string UpdatedAt { get; set; }

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
