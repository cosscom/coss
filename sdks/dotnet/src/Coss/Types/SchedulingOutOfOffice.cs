using Coss.Core;
using global::System.Text.Json;
using global::System.Text.Json.Serialization;

namespace Coss;

[Serializable]
public record SchedulingOutOfOffice : IJsonOnDeserialized
{
    [JsonExtensionData]
    private readonly IDictionary<string, JsonElement> _extensionData =
        new Dictionary<string, JsonElement>();

    [JsonPropertyName("object")]
    public required SchedulingOutOfOfficeObject Object { get; set; }

    [JsonPropertyName("id")]
    public required string Id { get; set; }

    [JsonPropertyName("host")]
    public required string Host { get; set; }

    [JsonPropertyName("start")]
    public required string Start { get; set; }

    [JsonPropertyName("end")]
    public required string End { get; set; }

    /// <summary>
    /// How it was given, when it was as whole dates.
    /// </summary>
    [Nullable]
    [JsonPropertyName("all_day")]
    public SchedulingOutOfOfficeAllDay? AllDay { get; set; }

    [JsonPropertyName("reason")]
    public required string Reason { get; set; }

    [Nullable]
    [JsonPropertyName("notes")]
    public string? Notes { get; set; }

    [Nullable]
    [JsonPropertyName("public_message")]
    public string? PublicMessage { get; set; }

    [JsonPropertyName("show_on_calendar")]
    public required bool ShowOnCalendar { get; set; }

    /// <summary>
    /// Who can be booked in their place.
    /// </summary>
    [JsonPropertyName("delegates")]
    public IEnumerable<string> Delegates { get; set; } = new List<string>();

    [JsonPropertyName("existing_bookings")]
    public required SchedulingOutOfOfficeExistingBookings ExistingBookings { get; set; }

    [Nullable]
    [JsonPropertyName("external_id")]
    public string? ExternalId { get; set; }

    /// <summary>
    /// Shared by the entries one request made for several hosts.
    /// </summary>
    [Nullable]
    [JsonPropertyName("group")]
    public string? Group { get; set; }

    [JsonPropertyName("source")]
    public required SchedulingOutOfOfficeSource Source { get; set; }

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
