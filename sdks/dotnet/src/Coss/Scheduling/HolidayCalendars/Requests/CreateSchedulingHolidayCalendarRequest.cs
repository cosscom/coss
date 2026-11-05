using Coss.Core;
using global::System.Text.Json.Serialization;
using OneOf;

namespace Coss.Scheduling;

[Serializable]
public record CreateSchedulingHolidayCalendarRequest
{
    [JsonPropertyName("name")]
    public required string Name { get; set; }

    /// <summary>
    /// A code from the list of holiday calendars, such as `GB`.
    /// </summary>
    [Optional]
    [JsonPropertyName("country")]
    public string? Country { get; set; }

    /// <summary>
    /// Your own feed, https or webcal, read in live environments. Stored encrypted.
    /// </summary>
    [Optional]
    [JsonPropertyName("ics_url")]
    public string? IcsUrl { get; set; }

    /// <summary>
    /// These hosts, by id or uid.
    /// </summary>
    [Optional]
    [JsonPropertyName("hosts")]
    public IEnumerable<string>? Hosts { get; set; }

    /// <summary>
    /// Everyone matching these attributes, asked again at every sync.
    /// </summary>
    [Optional]
    [JsonPropertyName("host_filter")]
    public Dictionary<string, OneOf<string, IEnumerable<string>>>? HostFilter { get; set; }

    /// <summary>
    /// Which regional holidays apply, matched against how the calendar names them, such as `England`. Without this, all of them do; empty, only nationwide ones.
    /// </summary>
    [Optional]
    [JsonPropertyName("regions")]
    public IEnumerable<string>? Regions { get; set; }

    /// <summary>
    /// Who can be booked in their place on those days, by id or uid, in order.
    /// </summary>
    [Optional]
    [JsonPropertyName("delegates")]
    public IEnumerable<string>? Delegates { get; set; }

    /// <summary>
    /// What happens to bookings already on a holiday. `leave` (the default) only reports them. `reassign` moves them.
    /// </summary>
    [Optional]
    [JsonPropertyName("existing_bookings")]
    public CreateSchedulingHolidayCalendarRequestExistingBookings? ExistingBookings { get; set; }

    /// <inheritdoc />
    public override string ToString()
    {
        return JsonUtils.Serialize(this);
    }
}
