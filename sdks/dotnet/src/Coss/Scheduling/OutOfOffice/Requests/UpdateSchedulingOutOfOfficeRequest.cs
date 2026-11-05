using Coss.Core;
using global::System.Text.Json.Serialization;

namespace Coss.Scheduling;

[Serializable]
public record UpdateSchedulingOutOfOfficeRequest
{
    /// <summary>
    /// The entry's id.
    /// </summary>
    [JsonIgnore]
    public required string Id { get; set; }

    /// <summary>
    /// An ISO 8601 instant with an offset.
    /// </summary>
    [Optional]
    [JsonPropertyName("start")]
    public string? Start { get; set; }

    /// <summary>
    /// An ISO 8601 instant with an offset.
    /// </summary>
    [Optional]
    [JsonPropertyName("end")]
    public string? End { get; set; }

    /// <summary>
    /// The first whole day away. Use instead of `start` and `end`.
    /// </summary>
    [Optional]
    [JsonPropertyName("start_date")]
    public string? StartDate { get; set; }

    /// <summary>
    /// The last whole day away, which is included.
    /// </summary>
    [Optional]
    [JsonPropertyName("end_date")]
    public string? EndDate { get; set; }

    /// <summary>
    /// What the dates mean in. Default: the host's zone when this is made.
    /// </summary>
    [Optional]
    [JsonPropertyName("time_zone")]
    public string? TimeZone { get; set; }

    /// <summary>
    /// One of `unspecified`, `vacation`, `travel`, `sick`, `public_holiday`, `parental_leave`, `training` and `other`, or a key from the settings' `out_of_office_reasons`. Only people who manage this host see it: never bookers, webhooks or calendars.
    /// </summary>
    [Optional]
    [JsonPropertyName("reason")]
    public string? Reason { get; set; }

    [Nullable, Optional]
    [JsonPropertyName("notes")]
    public Optional<string?> Notes { get; set; }

    [Nullable, Optional]
    [JsonPropertyName("public_message")]
    public Optional<string?> PublicMessage { get; set; }

    [Optional]
    [JsonPropertyName("show_on_calendar")]
    public bool? ShowOnCalendar { get; set; }

    /// <summary>
    /// Who can be booked in this host's place during it, by id or uid, in the order to try them. They still have to fit how a booking's routed.
    /// </summary>
    [Optional]
    [JsonPropertyName("delegates")]
    public IEnumerable<string>? Delegates { get; set; }

    /// <summary>
    /// What happens to bookings already in the way. `leave` (the default) only reports them. `reassign` moves them, and any nobody can take stay where they are.
    /// </summary>
    [Optional]
    [JsonPropertyName("existing_bookings")]
    public UpdateSchedulingOutOfOfficeRequestExistingBookings? ExistingBookings { get; set; }

    /// <summary>
    /// With `existing_bookings: reassign`: who they go to. Default: the fairest who's free.
    /// </summary>
    [Optional]
    [JsonPropertyName("reassign")]
    public UpdateSchedulingOutOfOfficeRequestReassign? Reassign { get; set; }

    /// <inheritdoc />
    public override string ToString()
    {
        return JsonUtils.Serialize(this);
    }
}
